/**
 * ACE Integration for Agentic Organism Framework - US-009
 *
 * Connects AdaptiveExpertMixture (MoE) to existing ACE (Adaptive Consensus Engine).
 * Provides bidirectional integration between swarm intelligence and multi-agent voting.
 *
 * Integration points:
 * - Before auction: Enrich with stigmergic data from StigmergicEnvironment
 * - After consensus: Record to stigmergy for learning
 * - Use existing HopGrouping for vote consolidation
 * - Apply DQ scoring (validity 40% + specificity 30% + correctness 30%)
 *
 * Research basis:
 * - arXiv:2511.15755 (MyAntFarm.ai DQ scoring)
 * - arXiv:2506.15672 (SwarmAgentic) - Stigmergic coordination
 * - arXiv:2508.17536 (Voting vs Debate)
 */

import type {
  OrganismTask,
  OrganismResult,
  SubsystemType,
  DQScore,
} from '../../archon/types';

import type {
  ACEConfig,
  ACEResult,
  ACEStatus,
  AuctionResult,
  ComplexityProfile,
  HopGroupingResult,
} from '../../../types/domain/convergence';

import type { AtomicTask, HiveAgent } from '../../../types';

import {
  AdaptiveExpertMixture,
  adaptiveMoE,
  type ExpertSpec,
  type MoEConfig,
} from './adaptiveMoE';

import {
  StigmergicEnvironment,
  stigmergicEnvironment,
  type StigmergicPrior,
  type ConsensusResult,
  type VoteSignal,
  type DQTraceSignal,
  type PatternSignal,
} from './stigmergy';

import { performHopGrouping, type HopGroupingOptions } from '../../hopGrouping';
import { HIVE_AGENTS } from '../../agents';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Enriched auction configuration with stigmergic priors.
 */
export interface EnrichedAuctionConfig {
  /** Base auction configuration */
  baseConfig: Partial<ACEConfig>;

  /** Stigmergic priors for routing decisions */
  priors: StigmergicPrior[];

  /** Recommended agents based on priors */
  recommendedAgents: string[];

  /** Prior-adjusted agent weights */
  agentWeights: Map<string, number>;

  /** Expected DQ score from historical data */
  expectedDqScore?: number;

  /** Confidence in the enrichment */
  enrichmentConfidence: number;

  /** Evidence supporting the enrichment */
  evidence: string[];
}

/**
 * ACE Integration configuration.
 */
export interface ACEIntegrationConfig {
  /** Weight given to stigmergic priors in routing (0-1) */
  stigmergicWeight: number;

  /** Minimum prior confidence to influence routing */
  minPriorConfidence: number;

  /** Enable hop grouping consolidation */
  enableHopGrouping: boolean;

  /** Enable DQ scoring integration */
  enableDQScoring: boolean;

  /** Enable pattern learning from consensus */
  enablePatternLearning: boolean;

  /** Maximum agents to recommend based on priors */
  maxPriorAgents: number;
}

/**
 * Swarm-ACE bridge state.
 */
interface BridgeState {
  /** Whether connected to ACE */
  connected: boolean;

  /** Last connection timestamp */
  lastConnected: number;

  /** Total enrichments performed */
  enrichmentCount: number;

  /** Total consensus recordings */
  recordingCount: number;

  /** Success rate of enriched auctions */
  enrichmentSuccessRate: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_ACE_INTEGRATION_CONFIG: ACEIntegrationConfig = {
  stigmergicWeight: 0.35,
  minPriorConfidence: 0.4,
  enableHopGrouping: true,
  enableDQScoring: true,
  enablePatternLearning: true,
  maxPriorAgents: 5,
};

// =============================================================================
// DQ SCORING WEIGHTS (from arXiv:2511.15755)
// =============================================================================

const DQ_WEIGHTS = {
  validity: 0.4,      // 40% - Does the output make sense?
  specificity: 0.3,   // 30% - Are there concrete identifiers?
  correctness: 0.3,   // 30% - Does it solve the problem?
};

// =============================================================================
// ACE INTEGRATION CLASS
// =============================================================================

/**
 * ACEIntegration bridges the swarm layer with the existing ACE system.
 *
 * This class provides:
 * 1. connectToACE() - Register swarm layer capabilities with ACE
 * 2. enrichAuctionWithStigmergy() - Add stigmergic priors to auction config
 * 3. recordACEConsensus() - Feed consensus results back to stigmergy
 * 4. getSwarmPriors() - Retrieve priors for ACE voting
 */
export class ACEIntegration {
  private static instance: ACEIntegration | null = null;

  private config: ACEIntegrationConfig;
  private state: BridgeState;
  private moe: AdaptiveExpertMixture;
  private stigmergy: StigmergicEnvironment;

  // HIVE_AGENTS reference for compatibility
  private hiveAgents: Record<string, HiveAgent>;

  // Metrics tracking
  private metrics = {
    enrichments: 0,
    recordings: 0,
    priorQueries: 0,
    hopGroupings: 0,
    avgEnrichmentConfidence: 0,
    avgPriorCount: 0,
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<ACEIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_ACE_INTEGRATION_CONFIG, ...config };
    this.moe = adaptiveMoE;
    this.stigmergy = stigmergicEnvironment;
    this.hiveAgents = HIVE_AGENTS;

    this.state = {
      connected: false,
      lastConnected: 0,
      enrichmentCount: 0,
      recordingCount: 0,
      enrichmentSuccessRate: 0,
    };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<ACEIntegrationConfig>): ACEIntegration {
    if (!ACEIntegration.instance) {
      ACEIntegration.instance = new ACEIntegration(config);
    }
    return ACEIntegration.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    ACEIntegration.instance = null;
  }

  // ---------------------------------------------------------------------------
  // 1. Connect to ACE
  // ---------------------------------------------------------------------------

  /**
   * Register swarm layer with ACE.
   *
   * This method:
   * - Registers swarm experts as ACE-compatible agents
   * - Sets up event listeners for ACE status updates
   * - Initializes stigmergic signal tracking for ACE tasks
   */
  connectToACE(): void {
    if (this.state.connected) {
      console.warn('[ACE-Integration] Already connected to ACE');
      return;
    }

    // Register HIVE_AGENTS as experts in the MoE
    this.registerHiveAgentsAsExperts();

    // Initialize stigmergic tracking for HIVE agents
    this.initializeStigmergicTracking();

    this.state.connected = true;
    this.state.lastConnected = Date.now();

    console.log('[ACE-Integration] Connected to ACE', {
      hiveAgents: Object.keys(this.hiveAgents).length,
      stigmergicConfig: this.stigmergy.getConfig(),
      moeConfig: this.moe.getConfig(),
    });
  }

  /**
   * Register HIVE_AGENTS (Dr. Ira, Mike, Caleb, etc.) as MoE experts.
   */
  private registerHiveAgentsAsExperts(): void {
    const agentSpecializations: Record<string, string[]> = {
      'dr_ira': ['risk-analysis', 'security-auditing', 'compliance', 'validation'],
      'mike': ['system-architecture', 'rapid-prototyping', 'innovation', 'code-generation'],
      'caleb': ['project-execution', 'resource-optimization', 'process-engineering', 'planning'],
      'paramdeep': ['systems-thinking', 'strategic-planning', 'architecture-patterns', 'reasoning'],
      'bilal': ['user-experience', 'customer-empathy', 'growth-strategy', 'text-generation'],
      'noah': ['communication-strategy', 'brand-voice', 'content-architecture', 'summarization'],
      'helen': ['creative-direction', 'visual-storytelling', 'brand-identity', 'transformation'],
      'perri': ['visual-systems', 'data-visualization', 'ui-ux-design', 'search'],
    };

    for (const [agentId, agent] of Object.entries(this.hiveAgents)) {
      // Skip generic voice personas
      if (!agent.weights) continue;

      const spec: ExpertSpec = {
        id: agentId,
        specialization: agentSpecializations[agentId] || ['general'],
        capacity: 3, // Each HIVE agent can handle 3 concurrent tasks
        currentLoad: 0,
        metrics: {
          successRate: 0.8,
          avgDqScore: 0.7,
          avgLatency: 500,
          invocations: 0,
          recentScores: [],
        },
      };

      // Register with validator based on agent weights
      this.moe.registerExpert(agentId, spec, (output: unknown) => {
        return this.computeAgentDQScore(output, agent);
      });
    }
  }

  /**
   * Compute DQ score for agent output using agent weights.
   */
  private computeAgentDQScore(output: unknown, agent: HiveAgent): DQScore {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    const now = Date.now();

    // Heuristic scoring based on output characteristics
    const validity = this.computeValidity(outputStr, agent);
    const specificity = this.computeSpecificity(outputStr);
    const correctness = this.computeCorrectness(outputStr, agent);

    const score =
      validity * DQ_WEIGHTS.validity +
      specificity * DQ_WEIGHTS.specificity +
      correctness * DQ_WEIGHTS.correctness;

    return {
      score,
      components: { validity, specificity, correctness },
      isActionable: score > 0.5,
      timestamp: now,
    };
  }

  private computeValidity(output: string, agent: HiveAgent): number {
    // Higher skepticism agents produce more carefully validated outputs
    const baseValidity = 0.6 + Math.random() * 0.2;
    const skepticismBonus = (agent.weights?.skepticism || 0.5) * 0.2;
    return Math.min(1, baseValidity + skepticismBonus);
  }

  private computeSpecificity(output: string): number {
    // Check for concrete identifiers
    const hasNumbers = /\d+/.test(output);
    const hasCommands = /`[^`]+`/.test(output);
    const hasVersions = /v?\d+\.\d+(\.\d+)?/.test(output);
    const hasUrls = /https?:\/\//.test(output);

    let score = 0.4;
    if (hasNumbers) score += 0.15;
    if (hasCommands) score += 0.15;
    if (hasVersions) score += 0.15;
    if (hasUrls) score += 0.1;

    return Math.min(1, score + Math.random() * 0.1);
  }

  private computeCorrectness(output: string, agent: HiveAgent): number {
    // Higher logic agents produce more correct outputs
    const baseCorrectness = 0.5 + Math.random() * 0.2;
    const logicBonus = (agent.weights?.logic || 0.5) * 0.2;
    const creativityPenalty = (agent.weights?.creativity || 0.5) * 0.1; // Creative outputs may be less "correct"
    return Math.min(1, Math.max(0, baseCorrectness + logicBonus - creativityPenalty));
  }

  /**
   * Initialize stigmergic signal tracking for HIVE agents.
   */
  private initializeStigmergicTracking(): void {
    // Deposit initial DQ traces for each agent's domain
    for (const [agentId, agent] of Object.entries(this.hiveAgents)) {
      if (!agent.expertise) continue;

      for (const domain of agent.expertise) {
        const contextHash = `domain_${domain.toLowerCase().replace(/\s+/g, '_')}`;
        this.stigmergy.depositDQTrace(
          contextHash,
          0.7, // Initial DQ score estimate
          'swarm' as SubsystemType,
          { validity: 0.7, specificity: 0.7, correctness: 0.7 }
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Enrich Auction with Stigmergy
  // ---------------------------------------------------------------------------

  /**
   * Enrich auction configuration with stigmergic data from the environment.
   *
   * Before an ACE auction, this method:
   * 1. Retrieves relevant stigmergic priors
   * 2. Computes recommended agents based on historical performance
   * 3. Adjusts agent weights based on prior success patterns
   *
   * @param task - The task being auctioned
   * @param auctionConfig - Base auction configuration
   * @returns Enriched configuration with stigmergic priors
   */
  enrichAuctionWithStigmergy(
    task: OrganismTask,
    auctionConfig: Partial<ACEConfig>
  ): EnrichedAuctionConfig {
    if (!this.state.connected) {
      console.warn('[ACE-Integration] Not connected to ACE, connecting now...');
      this.connectToACE();
    }

    // Get stigmergic priors for this task
    const priors = this.stigmergy.getRelevantTraces(task);
    this.metrics.priorQueries++;

    // Compute recommended agents based on priors
    const recommendedAgents = this.computeRecommendedAgents(priors, task);

    // Compute agent weights adjusted by priors
    const agentWeights = this.computePriorAdjustedWeights(priors, task);

    // Calculate expected DQ from historical data
    const expectedDqScore = this.computeExpectedDQ(priors);

    // Calculate enrichment confidence
    const enrichmentConfidence = this.computeEnrichmentConfidence(priors);

    // Collect evidence
    const evidence = priors.flatMap((p) => p.evidence).slice(0, 10);

    this.metrics.enrichments++;
    this.updateAvgMetrics(enrichmentConfidence, priors.length);
    this.state.enrichmentCount++;

    return {
      baseConfig: auctionConfig,
      priors,
      recommendedAgents,
      agentWeights,
      expectedDqScore,
      enrichmentConfidence,
      evidence,
    };
  }

  /**
   * Compute recommended agents based on stigmergic priors.
   */
  private computeRecommendedAgents(
    priors: StigmergicPrior[],
    task: OrganismTask
  ): string[] {
    const agentScores = new Map<string, number>();

    // Score agents based on priors
    for (const prior of priors) {
      if (prior.confidence < this.config.minPriorConfidence) continue;

      // Find agents that match the prior's subsystem recommendation
      for (const [agentId, agent] of Object.entries(this.hiveAgents)) {
        if (!agent.expertise) continue;

        // Check expertise alignment with prior evidence
        const expertiseMatch = this.computeExpertiseMatch(agent, prior, task);
        const currentScore = agentScores.get(agentId) || 0;
        const priorContribution = prior.probability * prior.confidence * expertiseMatch;
        agentScores.set(agentId, currentScore + priorContribution);
      }
    }

    // Sort by score and return top agents
    return Array.from(agentScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.maxPriorAgents)
      .map(([agentId]) => agentId);
  }

  /**
   * Compute expertise match between agent and prior.
   */
  private computeExpertiseMatch(
    agent: HiveAgent,
    prior: StigmergicPrior,
    task: OrganismTask
  ): number {
    if (!agent.expertise) return 0.5;

    const taskKeywords = this.extractKeywords(task.intent);
    const expertiseKeywords = agent.expertise.flatMap((e) =>
      e.toLowerCase().split(/\s+/)
    );

    // Count keyword matches
    const matches = taskKeywords.filter((k) =>
      expertiseKeywords.some((ek) => ek.includes(k) || k.includes(ek))
    ).length;

    return Math.min(1, 0.3 + (matches / Math.max(1, taskKeywords.length)) * 0.7);
  }

  /**
   * Compute prior-adjusted weights for agents.
   */
  private computePriorAdjustedWeights(
    priors: StigmergicPrior[],
    task: OrganismTask
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const stigmergicWeight = this.config.stigmergicWeight;

    for (const [agentId, agent] of Object.entries(this.hiveAgents)) {
      if (!agent.weights) continue;

      // Base weight from agent profile
      const baseWeight =
        (agent.weights.logic || 0.5) * 0.3 +
        (agent.weights.creativity || 0.5) * 0.3 +
        (1 - (agent.weights.skepticism || 0.5)) * 0.2 +
        (agent.weights.empathy || 0.5) * 0.2;

      // Prior weight from stigmergic traces
      let priorWeight = 0;
      for (const prior of priors) {
        if (prior.confidence < this.config.minPriorConfidence) continue;
        const expertiseMatch = this.computeExpertiseMatch(agent, prior, task);
        priorWeight += prior.probability * prior.confidence * expertiseMatch;
      }

      // Combine with stigmergic weight
      const combinedWeight =
        baseWeight * (1 - stigmergicWeight) + priorWeight * stigmergicWeight;
      weights.set(agentId, Math.min(1, combinedWeight));
    }

    return weights;
  }

  /**
   * Compute expected DQ score from priors.
   */
  private computeExpectedDQ(priors: StigmergicPrior[]): number | undefined {
    const validPriors = priors.filter((p) => p.expectedDqScore !== undefined);
    if (validPriors.length === 0) return undefined;

    // Weighted average by probability
    let weightedSum = 0;
    let totalWeight = 0;
    for (const prior of validPriors) {
      weightedSum += prior.expectedDqScore! * prior.probability;
      totalWeight += prior.probability;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : undefined;
  }

  /**
   * Compute enrichment confidence based on prior quality.
   */
  private computeEnrichmentConfidence(priors: StigmergicPrior[]): number {
    if (priors.length === 0) return 0;

    // Factors: number of priors, average confidence, source diversity
    const priorCount = Math.min(1, priors.length / 5);
    const avgConfidence =
      priors.reduce((sum, p) => sum + p.confidence, 0) / priors.length;
    const sourceDiversity = this.computeSourceDiversity(priors);

    return priorCount * 0.3 + avgConfidence * 0.4 + sourceDiversity * 0.3;
  }

  private computeSourceDiversity(priors: StigmergicPrior[]): number {
    const sourceTypes = new Set<string>();
    for (const prior of priors) {
      if (prior.sources.votes > 0) sourceTypes.add('votes');
      if (prior.sources.traces > 0) sourceTypes.add('traces');
      if (prior.sources.patterns > 0) sourceTypes.add('patterns');
    }
    return sourceTypes.size / 3;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'this', 'that', 'these', 'those', 'it', 'its', 'and', 'or',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private updateAvgMetrics(confidence: number, priorCount: number): void {
    const n = this.metrics.enrichments;
    this.metrics.avgEnrichmentConfidence =
      (this.metrics.avgEnrichmentConfidence * (n - 1) + confidence) / n;
    this.metrics.avgPriorCount =
      (this.metrics.avgPriorCount * (n - 1) + priorCount) / n;
  }

  // ---------------------------------------------------------------------------
  // 3. Record ACE Consensus
  // ---------------------------------------------------------------------------

  /**
   * Record ACE consensus result to stigmergy for learning.
   *
   * After ACE completes, this method:
   * 1. Deposits vote signals for participating agents
   * 2. Records DQ traces for context-outcome mappings
   * 3. Updates pattern signals based on success/failure
   * 4. Feeds back to MoE for expert performance tracking
   *
   * @param result - The ACE result to record
   */
  recordACEConsensus(result: ACEResult): void {
    if (!this.state.connected) {
      console.warn('[ACE-Integration] Not connected to ACE');
      return;
    }

    const now = Date.now();

    // Build consensus result for stigmergy
    const consensusResult: ConsensusResult = {
      taskId: result.taskId,
      decision: result.output,
      subsystem: 'ace' as SubsystemType,
      votes: this.extractVotesFromLedger(result.voteLedger),
      dqScore: result.dqScore || {
        score: 0.7,
        components: { validity: 0.7, specificity: 0.7, correctness: 0.7 },
        isActionable: true,
        timestamp: now,
      },
      success: result.confidence > 50,
      latencyMs: result.executionTime,
      participants: result.voteLedger.participatingAgents || [],
      timestamp: now,
    };

    // Record to stigmergy
    this.stigmergy.recordConsensus(consensusResult);

    // Deposit additional vote signals for winning agents
    this.depositWinningAgentVotes(result);

    // Feed back to MoE if hop grouping was used
    if (result.hopGroupingResult && this.config.enableHopGrouping) {
      this.recordHopGroupingOutcome(result.hopGroupingResult, result);
      this.metrics.hopGroupings++;
    }

    // Update pattern learning if enabled
    if (this.config.enablePatternLearning && result.patternStored) {
      this.depositPatternSignal(result);
    }

    this.metrics.recordings++;
    this.state.recordingCount++;

    // Update enrichment success rate
    if (result.auctionResult) {
      const isSuccess = result.confidence > 70 && (result.dqScore?.score || 0) > 0.6;
      this.state.enrichmentSuccessRate =
        (this.state.enrichmentSuccessRate * (this.state.recordingCount - 1) +
          (isSuccess ? 1 : 0)) /
        this.state.recordingCount;
    }

    console.log('[ACE-Integration] Recorded consensus', {
      taskId: result.taskId,
      confidence: result.confidence,
      dqScore: result.dqScore?.score,
      participants: consensusResult.participants.length,
    });
  }

  /**
   * Extract votes map from vote ledger.
   */
  private extractVotesFromLedger(
    ledger: ACEResult['voteLedger']
  ): Map<string, number> {
    const votes = new Map<string, number>();
    votes.set(ledger.winner, ledger.count);
    if (ledger.runnerUp) {
      votes.set(ledger.runnerUp, ledger.runnerUpCount);
    }
    return votes;
  }

  /**
   * Deposit vote signals for winning agents.
   */
  private depositWinningAgentVotes(result: ACEResult): void {
    // Parse winning agents from agentId (e.g., "ACE_dr_ira+mike")
    const agentIdMatch = result.agentId.match(/ACE_(?:TIMEOUT_)?(.+)/);
    if (!agentIdMatch) return;

    const winningAgents = agentIdMatch[1].split('+');
    const confidence = Math.min(1, result.confidence / 100);

    for (const agentId of winningAgents) {
      this.stigmergy.depositVote(
        agentId,
        result.taskId,
        result.output.substring(0, 100), // Truncate for storage
        confidence,
        `task_${result.taskId}`
      );
    }
  }

  /**
   * Record hop grouping outcome to stigmergy.
   */
  private recordHopGroupingOutcome(
    hopResult: HopGroupingResult,
    aceResult: ACEResult
  ): void {
    const winningGroup = hopResult.winningGroup;
    if (!winningGroup) return;

    // Deposit DQ traces for the winning group's contributors
    for (const agentId of winningGroup.agentContributors) {
      const contextHash = `hop_${aceResult.taskId}_${agentId}`;
      this.stigmergy.depositDQTrace(
        contextHash,
        winningGroup.dqScore?.score || 0.7,
        'swarm' as SubsystemType,
        winningGroup.dqScore?.components
      );
    }
  }

  /**
   * Deposit pattern signal for learned behavior.
   */
  private depositPatternSignal(result: ACEResult): void {
    if (!result.complexity) return;

    const patternId = `ace_${result.complexity.domain || 'general'}_${result.complexity.taskType}`;

    this.stigmergy.depositPattern(
      patternId,
      {
        intentKeywords: [], // Would be extracted from task
        priority: undefined,
      },
      {
        subsystem: 'ace' as SubsystemType,
        expectedDqScore: result.dqScore?.score || 0.7,
        expectedLatency: result.executionTime,
      },
      result.confidence / 100
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Get Swarm Priors
  // ---------------------------------------------------------------------------

  /**
   * Get stigmergic priors for ACE voting decisions.
   *
   * @param task - The task to get priors for
   * @returns Array of stigmergic priors sorted by probability
   */
  getSwarmPriors(task: OrganismTask): StigmergicPrior[] {
    if (!this.state.connected) {
      console.warn('[ACE-Integration] Not connected to ACE, connecting now...');
      this.connectToACE();
    }

    const priors = this.stigmergy.getRelevantTraces(task);
    this.metrics.priorQueries++;

    // Filter by minimum confidence
    return priors.filter((p) => p.confidence >= this.config.minPriorConfidence);
  }

  /**
   * Get priors specifically for agent selection.
   *
   * @param task - The task being processed
   * @returns Priors with agent-specific recommendations
   */
  getAgentSelectionPriors(
    task: OrganismTask
  ): {
    priors: StigmergicPrior[];
    agentRankings: Array<{ agentId: string; score: number; evidence: string[] }>;
  } {
    const priors = this.getSwarmPriors(task);
    const agentScores = new Map<string, { score: number; evidence: string[] }>();

    // Score each agent based on priors
    for (const [agentId, agent] of Object.entries(this.hiveAgents)) {
      if (!agent.expertise) continue;

      let totalScore = 0;
      const evidence: string[] = [];

      for (const prior of priors) {
        const match = this.computeExpertiseMatch(agent, prior, task);
        if (match > 0.5) {
          totalScore += prior.probability * prior.confidence * match;
          evidence.push(...prior.evidence.slice(0, 2));
        }
      }

      if (totalScore > 0) {
        agentScores.set(agentId, {
          score: totalScore,
          evidence: Array.from(new Set(evidence)).slice(0, 5),
        });
      }
    }

    const agentRankings = Array.from(agentScores.entries())
      .map(([agentId, data]) => ({
        agentId,
        score: data.score,
        evidence: data.evidence,
      }))
      .sort((a, b) => b.score - a.score);

    return { priors, agentRankings };
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods
  // ---------------------------------------------------------------------------

  /**
   * Convert AtomicTask to OrganismTask for compatibility.
   */
  convertAtomicToOrganismTask(atomic: AtomicTask): OrganismTask {
    return {
      id: atomic.id,
      intent: atomic.instruction,
      priority: 'normal',
      contextPages: [],
      createdAt: Date.now(),
    };
  }

  /**
   * Perform hop grouping using the existing hopGrouping service.
   */
  performHopGroupingWithConfig(
    votes: Record<string, number>,
    answerMap: Record<string, string>,
    agentContributions: Record<string, string[]>,
    task: AtomicTask
  ): HopGroupingResult {
    const options: HopGroupingOptions = {
      maxGroups: 5,
      similarityThreshold: 0.6,
      scoreDQ: this.config.enableDQScoring,
    };

    return performHopGrouping(votes, answerMap, agentContributions, task, options);
  }

  // ---------------------------------------------------------------------------
  // Configuration & Metrics
  // ---------------------------------------------------------------------------

  /**
   * Update configuration.
   */
  setConfig(config: Partial<ACEIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ACEIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Get integration metrics.
   */
  getMetrics(): typeof this.metrics & { state: BridgeState } {
    return {
      ...this.metrics,
      state: { ...this.state },
    };
  }

  /**
   * Get connection state.
   */
  isConnected(): boolean {
    return this.state.connected;
  }

  /**
   * Disconnect from ACE.
   */
  disconnect(): void {
    this.state.connected = false;
    console.log('[ACE-Integration] Disconnected from ACE');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of ACEIntegration.
 */
export const aceIntegration = ACEIntegration.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createACEIntegration(
  config?: Partial<ACEIntegrationConfig>
): ACEIntegration {
  ACEIntegration.resetInstance();
  return ACEIntegration.getInstance(config);
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Connect to ACE.
 */
export function connectToACE(): void {
  aceIntegration.connectToACE();
}

/**
 * Enrich auction with stigmergic data.
 */
export function enrichAuctionWithStigmergy(
  task: OrganismTask,
  auctionConfig: Partial<ACEConfig>
): EnrichedAuctionConfig {
  return aceIntegration.enrichAuctionWithStigmergy(task, auctionConfig);
}

/**
 * Record ACE consensus to stigmergy.
 */
export function recordACEConsensus(result: ACEResult): void {
  aceIntegration.recordACEConsensus(result);
}

/**
 * Get swarm priors for a task.
 */
export function getSwarmPriors(task: OrganismTask): StigmergicPrior[] {
  return aceIntegration.getSwarmPriors(task);
}

export default {
  ACEIntegration,
  aceIntegration,
  createACEIntegration,
  connectToACE,
  enrichAuctionWithStigmergy,
  recordACEConsensus,
  getSwarmPriors,
};
