/**
 * ARCHON Escalation Controller
 *
 * Determines when to escalate to human and generates clear options.
 * Implements aggressive autonomy (5+ attempts before escalation).
 */

import {
  EscalationOption,
  EscalationRequest,
  HumanDecision,
  Goal,
  GoalStatus,
  DQScore,
  Priority,
} from '../types';
import { archonLog, generateId } from '../utils';

// =============================================================================
// ESCALATION CONFIGURATION
// =============================================================================

export interface EscalationConfig {
  // Thresholds
  maxAttempts: number;              // Max retries before escalation (default: 5)
  dqThreshold: number;              // Min DQ score to avoid escalation (default: 0.7)
  consecutiveFailures: number;      // Consecutive fails to trigger (default: 3)

  // Timing
  stuckTimeoutMs: number;           // Time without progress before escalation
  maxEscalationWaitMs: number;      // Max time waiting for human response

  // Options
  maxOptionsToGenerate: number;     // Max options to present (default: 4)
  includeAbortOption: boolean;      // Always include abort option
  includeRetryOption: boolean;      // Include "let me try again" option

  // Learning
  learnFromDecisions: boolean;      // Learn from human choices
}

const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  maxAttempts: 5,                   // Aggressive autonomy
  dqThreshold: 0.7,
  consecutiveFailures: 3,
  stuckTimeoutMs: 5 * 60 * 1000,    // 5 minutes
  maxEscalationWaitMs: 30 * 60 * 1000, // 30 minutes
  maxOptionsToGenerate: 4,
  includeAbortOption: true,
  includeRetryOption: true,
  learnFromDecisions: true,
};

// =============================================================================
// ESCALATION STATE
// =============================================================================

interface EscalationState {
  pendingEscalations: Map<string, EscalationRequest>;
  resolvedEscalations: Array<{
    request: EscalationRequest;
    decision: HumanDecision;
    resolvedAt: number;
  }>;
  statistics: EscalationStatistics;
}

interface EscalationStatistics {
  totalEscalations: number;
  avgResolutionTimeMs: number;
  optionSelectionCounts: Map<string, number>;
  escalationsByReason: Map<string, number>;
}

// =============================================================================
// ESCALATION CONTROLLER
// =============================================================================

export class EscalationController {
  private config: EscalationConfig;
  private state: EscalationState;

  constructor(config?: Partial<EscalationConfig>) {
    this.config = { ...DEFAULT_ESCALATION_CONFIG, ...config };
    this.state = {
      pendingEscalations: new Map(),
      resolvedEscalations: [],
      statistics: {
        totalEscalations: 0,
        avgResolutionTimeMs: 0,
        optionSelectionCounts: new Map(),
        escalationsByReason: new Map(),
      },
    };

    archonLog('info', 'EscalationController initialized', {
      maxAttempts: this.config.maxAttempts,
      dqThreshold: this.config.dqThreshold,
    });
  }

  // ===========================================================================
  // ESCALATION DECISIONS
  // ===========================================================================

  /**
   * Check if escalation is needed based on current state
   */
  shouldEscalate(
    attempts: number,
    dqScores: DQScore[],
    context?: {
      timeSinceStart?: number;
      consecutiveFailures?: number;
      errorTypes?: string[];
    }
  ): { escalate: boolean; reason?: string } {
    // Check attempt limit
    if (attempts >= this.config.maxAttempts) {
      return {
        escalate: true,
        reason: `Maximum attempts (${this.config.maxAttempts}) reached`,
      };
    }

    // Check recent DQ scores
    const recentScores = dqScores.slice(-3);
    const allBelowThreshold = recentScores.length >= 3 &&
      recentScores.every((s) => s.score < this.config.dqThreshold);
    if (allBelowThreshold) {
      return {
        escalate: true,
        reason: `${recentScores.length} consecutive scores below threshold (${this.config.dqThreshold})`,
      };
    }

    // Check for stuck state
    if (context?.timeSinceStart && context.timeSinceStart > this.config.stuckTimeoutMs) {
      return {
        escalate: true,
        reason: `Task stuck for ${Math.round(context.timeSinceStart / 60000)} minutes`,
      };
    }

    // Check consecutive failures
    if (context?.consecutiveFailures && context.consecutiveFailures >= this.config.consecutiveFailures) {
      return {
        escalate: true,
        reason: `${context.consecutiveFailures} consecutive failures`,
      };
    }

    return { escalate: false };
  }

  /**
   * Create an escalation request with options
   */
  createEscalation(
    goal: Goal,
    context: {
      attempts: number;
      failureReasons: string[];
      lastOutput?: string;
      candidateSolutions?: Array<{ description: string; confidence: number }>;
    }
  ): EscalationRequest {
    const options = this.generateOptions(goal, context);

    const request: EscalationRequest = {
      goalId: goal.id,
      context: this.formatContext(goal, context),
      attempts: context.attempts,
      failureReasons: context.failureReasons,
      options,
      createdAt: Date.now(),
    };

    this.state.pendingEscalations.set(goal.id, request);
    this.state.statistics.totalEscalations++;

    // Track escalation reason
    const primaryReason = context.failureReasons[0] ?? 'unknown';
    const reasonCount = this.state.statistics.escalationsByReason.get(primaryReason) ?? 0;
    this.state.statistics.escalationsByReason.set(primaryReason, reasonCount + 1);

    archonLog('info', `Escalation created for goal: ${goal.id}`, {
      attempts: context.attempts,
      optionCount: options.length,
      reason: primaryReason,
    });

    return request;
  }

  /**
   * Process human decision
   */
  resolveEscalation(
    goalId: string,
    decision: HumanDecision
  ): { success: boolean; nextAction?: string; error?: string } {
    const request = this.state.pendingEscalations.get(goalId);
    if (!request) {
      return { success: false, error: 'No pending escalation found' };
    }

    // Record resolution
    this.state.resolvedEscalations.push({
      request,
      decision,
      resolvedAt: Date.now(),
    });
    this.state.pendingEscalations.delete(goalId);

    // Update statistics
    const resolutionTime = decision.timestamp - request.createdAt;
    const totalResolutions = this.state.resolvedEscalations.length;
    this.state.statistics.avgResolutionTimeMs =
      (this.state.statistics.avgResolutionTimeMs * (totalResolutions - 1) + resolutionTime) / totalResolutions;

    // Track option selection
    const optionCount = this.state.statistics.optionSelectionCounts.get(decision.selectedOptionId) ?? 0;
    this.state.statistics.optionSelectionCounts.set(decision.selectedOptionId, optionCount + 1);

    // Determine next action
    const selectedOption = request.options.find((o) => o.id === decision.selectedOptionId);
    const nextAction = selectedOption?.label ?? decision.customInput ?? 'proceed';

    archonLog('info', `Escalation resolved: ${goalId}`, {
      selectedOption: decision.selectedOptionId,
      resolutionTimeMs: resolutionTime,
      customInput: decision.customInput ? 'yes' : 'no',
    });

    return { success: true, nextAction };
  }

  // ===========================================================================
  // OPTION GENERATION
  // ===========================================================================

  /**
   * Generate escalation options
   */
  private generateOptions(
    goal: Goal,
    context: {
      attempts: number;
      failureReasons: string[];
      lastOutput?: string;
      candidateSolutions?: Array<{ description: string; confidence: number }>;
    }
  ): EscalationOption[] {
    const options: EscalationOption[] = [];

    // Add candidate solutions if available
    if (context.candidateSolutions) {
      for (const candidate of context.candidateSolutions.slice(0, 2)) {
        options.push({
          id: generateId('opt'),
          label: candidate.description.slice(0, 50),
          description: candidate.description,
          confidence: candidate.confidence,
          tradeoffs: this.assessTradeoffs(candidate),
          estimatedCost: this.estimateOptionCost(candidate),
        });
      }
    }

    // Generate intelligent alternatives based on failure reasons
    const alternatives = this.generateAlternatives(goal, context.failureReasons);
    for (const alt of alternatives.slice(0, this.config.maxOptionsToGenerate - options.length - 1)) {
      options.push(alt);
    }

    // Add retry option if enabled
    if (this.config.includeRetryOption && context.attempts < this.config.maxAttempts + 2) {
      options.push({
        id: 'retry',
        label: 'Try Again',
        description: 'Let me try a different approach with fresh context',
        confidence: 0.5,
        tradeoffs: ['May succeed with different strategy', 'Could fail again'],
        estimatedCost: this.estimateRetryCost(goal),
      });
    }

    // Add abort option if enabled
    if (this.config.includeAbortOption) {
      options.push({
        id: 'abort',
        label: 'Abort Task',
        description: 'Stop working on this goal and mark it as failed',
        confidence: 1.0,
        tradeoffs: ['No further cost', 'Goal will not be completed'],
        estimatedCost: 0,
      });
    }

    return options.slice(0, this.config.maxOptionsToGenerate);
  }

  private generateAlternatives(
    goal: Goal,
    failureReasons: string[]
  ): EscalationOption[] {
    const alternatives: EscalationOption[] = [];
    const goalText = goal.text.toLowerCase();

    // Analyze failure patterns and suggest alternatives
    const hasCodeError = failureReasons.some((r) =>
      r.includes('syntax') || r.includes('compile') || r.includes('type')
    );
    const hasLogicError = failureReasons.some((r) =>
      r.includes('test') || r.includes('assertion') || r.includes('expected')
    );
    const hasResourceError = failureReasons.some((r) =>
      r.includes('timeout') || r.includes('memory') || r.includes('rate limit')
    );

    if (hasCodeError) {
      alternatives.push({
        id: generateId('opt'),
        label: 'Simplify Approach',
        description: 'Break down into smaller, simpler code changes',
        confidence: 0.7,
        tradeoffs: ['More incremental', 'Lower risk per change'],
        estimatedCost: 0.5,
      });
    }

    if (hasLogicError) {
      alternatives.push({
        id: generateId('opt'),
        label: 'Add Debug Logging',
        description: 'Add detailed logging to understand the logic flow',
        confidence: 0.6,
        tradeoffs: ['More information', 'Requires cleanup later'],
        estimatedCost: 0.3,
      });
    }

    if (hasResourceError) {
      alternatives.push({
        id: generateId('opt'),
        label: 'Use Smaller Model',
        description: 'Switch to a faster, cheaper model for this task',
        confidence: 0.6,
        tradeoffs: ['Lower cost', 'May be lower quality'],
        estimatedCost: 0.2,
      });
    }

    // Generic alternatives
    alternatives.push({
      id: generateId('opt'),
      label: 'Decompose Further',
      description: 'Break this goal into smaller, more specific sub-tasks',
      confidence: 0.65,
      tradeoffs: ['More manageable pieces', 'Requires coordination'],
      estimatedCost: 0.4,
    });

    if (goalText.includes('implement') || goalText.includes('add') || goalText.includes('create')) {
      alternatives.push({
        id: generateId('opt'),
        label: 'Provide Example',
        description: 'I can provide more context or an example of what I want',
        confidence: 0.7,
        tradeoffs: ['Clearer requirements', 'Requires your input'],
        estimatedCost: 0.1,
      });
    }

    return alternatives;
  }

  private assessTradeoffs(candidate: { description: string; confidence: number }): string[] {
    const tradeoffs: string[] = [];

    if (candidate.confidence > 0.8) {
      tradeoffs.push('High confidence solution');
    } else if (candidate.confidence < 0.5) {
      tradeoffs.push('Experimental approach');
    }

    if (candidate.description.length > 200) {
      tradeoffs.push('Complex implementation');
    } else {
      tradeoffs.push('Straightforward approach');
    }

    return tradeoffs;
  }

  private estimateOptionCost(candidate: { description: string; confidence: number }): number {
    // Rough cost estimate based on complexity
    const baseMultiplier = 1 - candidate.confidence; // Less confident = more iterations
    return 0.5 * (1 + baseMultiplier);
  }

  private estimateRetryCost(goal: Goal): number {
    // Estimate cost for another attempt
    return (goal.metadata.complexity ?? 0.5) * 0.5;
  }

  // ===========================================================================
  // CONTEXT FORMATTING
  // ===========================================================================

  private formatContext(
    goal: Goal,
    context: {
      attempts: number;
      failureReasons: string[];
      lastOutput?: string;
    }
  ): string {
    const parts: string[] = [];

    parts.push(`**Goal:** ${goal.text}`);
    parts.push(`**Attempts:** ${context.attempts}`);

    if (context.failureReasons.length > 0) {
      parts.push(`**Issues encountered:**`);
      for (const reason of context.failureReasons.slice(0, 3)) {
        parts.push(`  - ${reason}`);
      }
    }

    if (context.lastOutput) {
      const truncated = context.lastOutput.length > 500
        ? context.lastOutput.slice(0, 500) + '...'
        : context.lastOutput;
      parts.push(`**Last output:** ${truncated}`);
    }

    return parts.join('\n');
  }

  // ===========================================================================
  // STATISTICS & QUERIES
  // ===========================================================================

  /**
   * Get pending escalations
   */
  getPendingEscalations(): EscalationRequest[] {
    return Array.from(this.state.pendingEscalations.values());
  }

  /**
   * Check if goal has pending escalation
   */
  hasPendingEscalation(goalId: string): boolean {
    return this.state.pendingEscalations.has(goalId);
  }

  /**
   * Get escalation statistics
   */
  getStatistics(): EscalationStatistics {
    return this.state.statistics;
  }

  /**
   * Get recent escalation history
   */
  getRecentHistory(limit: number = 10): Array<{
    goalId: string;
    selectedOption: string;
    resolutionTimeMs: number;
    resolvedAt: number;
  }> {
    return this.state.resolvedEscalations
      .slice(-limit)
      .map((r) => ({
        goalId: r.request.goalId,
        selectedOption: r.decision.selectedOptionId,
        resolutionTimeMs: r.resolvedAt - r.request.createdAt,
        resolvedAt: r.resolvedAt,
      }));
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let controllerInstance: EscalationController | null = null;

export function getEscalationController(
  config?: Partial<EscalationConfig>
): EscalationController {
  if (!controllerInstance) {
    controllerInstance = new EscalationController(config);
  }
  return controllerInstance;
}
