/**
 * ARCHON Feedback Learner
 *
 * Learns from human decisions, task outcomes, and model performance
 * to improve future orchestration decisions.
 */

import { Pattern, PatternType, PatternContext, PatternOutcome, SubsystemType, DQScore } from '../types';
import { archonLog, generateId } from '../utils';

// =============================================================================
// FEEDBACK TYPES
// =============================================================================

export interface TaskFeedback {
  taskId: string;
  goalText: string;
  success: boolean;
  dqScore: number;
  latencyMs: number;
  tokenCost: number;
  modelUsed: string;
  subsystemsUsed: SubsystemType[];
  humanIntervention: boolean;
  feedbackNotes?: string;
}

export interface HumanFeedback {
  escalationId: string;
  selectedOption: string;
  customInput?: string;
  reasoning?: string;
  satisfaction?: 'good' | 'acceptable' | 'poor';
}

export interface ModelFeedback {
  modelId: string;
  taskType: string;
  dqScore: number;
  latencyMs: number;
  success: boolean;
  complexity: number;
}

// =============================================================================
// FEEDBACK LEARNER CONFIGURATION
// =============================================================================

export interface LearnerConfig {
  // Learning rates
  patternLearningRate: number;      // How fast to update pattern confidence
  modelLearningRate: number;        // How fast to update model preferences

  // Thresholds
  minSamplesForPattern: number;     // Min samples before pattern is trusted
  patternDecayRate: number;         // How fast old patterns decay
  significanceThreshold: number;    // Min confidence for pattern to influence decisions

  // Storage
  maxPatterns: number;              // Maximum patterns to store
  maxFeedbackHistory: number;       // Maximum feedback records to keep
}

const DEFAULT_LEARNER_CONFIG: LearnerConfig = {
  patternLearningRate: 0.1,
  modelLearningRate: 0.15,
  minSamplesForPattern: 3,
  patternDecayRate: 0.01,
  significanceThreshold: 0.6,
  maxPatterns: 500,
  maxFeedbackHistory: 1000,
};

// =============================================================================
// FEEDBACK LEARNER
// =============================================================================

export class FeedbackLearner {
  private config: LearnerConfig;
  private patterns: Map<string, Pattern> = new Map();
  private feedbackHistory: TaskFeedback[] = [];
  private modelPerformance: Map<string, ModelPerformanceRecord> = new Map();

  constructor(config?: Partial<LearnerConfig>) {
    this.config = { ...DEFAULT_LEARNER_CONFIG, ...config };
    archonLog('info', 'FeedbackLearner initialized', {
      maxPatterns: this.config.maxPatterns,
      learningRate: this.config.patternLearningRate,
    });
  }

  // ===========================================================================
  // FEEDBACK PROCESSING
  // ===========================================================================

  /**
   * Process task completion feedback
   */
  processTaskFeedback(feedback: TaskFeedback): void {
    // Store feedback
    this.feedbackHistory.push(feedback);
    if (this.feedbackHistory.length > this.config.maxFeedbackHistory) {
      this.feedbackHistory.shift();
    }

    // Extract and update patterns
    const patternContext = this.extractContext(feedback);
    const patternOutcome = this.extractOutcome(feedback);
    this.updatePatterns(patternContext, patternOutcome);

    // Update model performance
    this.updateModelPerformance(feedback);

    archonLog('debug', 'Task feedback processed', {
      taskId: feedback.taskId,
      success: feedback.success,
      dqScore: feedback.dqScore,
      patternsUpdated: 1,
    });
  }

  /**
   * Process human escalation feedback
   */
  processHumanFeedback(feedback: HumanFeedback): void {
    // Learn from human option selection
    const pattern: Pattern = {
      id: generateId('pat'),
      type: 'escalation',
      context: {
        goalType: 'escalation',
        complexity: 0.8, // Escalations are typically complex
        subsystemsInvolved: [],
        keywords: this.extractKeywords(feedback.customInput ?? feedback.selectedOption),
        contextHash: this.hashContext({ selectedOption: feedback.selectedOption }),
      },
      outcome: {
        success: feedback.satisfaction !== 'poor',
        dqScore: feedback.satisfaction === 'good' ? 0.9 : feedback.satisfaction === 'acceptable' ? 0.7 : 0.4,
        latencyMs: 0,
        tokenCost: 0,
        humanIntervention: true,
      },
      confidence: 0.7,
      frequency: 1,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    this.storePattern(pattern);

    archonLog('debug', 'Human feedback processed', {
      escalationId: feedback.escalationId,
      satisfaction: feedback.satisfaction,
    });
  }

  /**
   * Process model-specific feedback
   */
  processModelFeedback(feedback: ModelFeedback): void {
    this.updateModelPerformance({
      taskId: '',
      goalText: '',
      success: feedback.success,
      dqScore: feedback.dqScore,
      latencyMs: feedback.latencyMs,
      tokenCost: 0,
      modelUsed: feedback.modelId,
      subsystemsUsed: [],
      humanIntervention: false,
    });

    // Create task-specific pattern
    const pattern: Pattern = {
      id: generateId('pat'),
      type: feedback.success ? 'success' : 'failure',
      context: {
        goalType: feedback.taskType,
        complexity: feedback.complexity,
        subsystemsInvolved: [],
        keywords: [feedback.taskType, feedback.modelId],
        contextHash: this.hashContext({ taskType: feedback.taskType, modelId: feedback.modelId }),
      },
      outcome: {
        success: feedback.success,
        dqScore: feedback.dqScore,
        latencyMs: feedback.latencyMs,
        tokenCost: 0,
        humanIntervention: false,
      },
      confidence: 0.6,
      frequency: 1,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    this.storePattern(pattern);
  }

  // ===========================================================================
  // PATTERN MATCHING
  // ===========================================================================

  /**
   * Find matching patterns for a given context
   */
  findMatchingPatterns(
    goalType: string,
    complexity: number,
    subsystems: SubsystemType[]
  ): Pattern[] {
    const matches: Array<{ pattern: Pattern; score: number }> = [];

    for (const pattern of Array.from(this.patterns.values())) {
      const score = this.calculatePatternMatch(pattern, goalType, complexity, subsystems);
      if (score > 0.5) {
        matches.push({ pattern, score });
      }
    }

    // Sort by match score * confidence
    return matches
      .sort((a, b) => (b.score * b.pattern.confidence) - (a.score * a.pattern.confidence))
      .map((m) => m.pattern);
  }

  /**
   * Get recommendation based on patterns
   */
  getRecommendation(
    goalType: string,
    complexity: number,
    subsystems: SubsystemType[]
  ): {
    suggestedModel?: string;
    suggestedSubsystems: SubsystemType[];
    confidence: number;
    reasoning: string;
  } {
    const patterns = this.findMatchingPatterns(goalType, complexity, subsystems);
    if (patterns.length === 0) {
      return {
        suggestedSubsystems: subsystems,
        confidence: 0.5,
        reasoning: 'No matching patterns found, using defaults',
      };
    }

    // Analyze successful patterns
    const successPatterns = patterns.filter((p) => p.type === 'success' && p.outcome.success);
    if (successPatterns.length === 0) {
      return {
        suggestedSubsystems: subsystems,
        confidence: 0.4,
        reasoning: 'No successful patterns found, proceeding with caution',
      };
    }

    // Find most common successful configuration
    const subsystemCounts = new Map<SubsystemType, number>();
    for (const pattern of successPatterns) {
      for (const subsystem of pattern.context.subsystemsInvolved) {
        subsystemCounts.set(subsystem, (subsystemCounts.get(subsystem) ?? 0) + 1);
      }
    }

    const suggestedSubsystems = Array.from(subsystemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    // Get best model from performance records
    const modelPerf = Array.from(this.modelPerformance.entries())
      .filter(([id, perf]) => perf.taskTypes.has(goalType))
      .sort((a, b) => b[1].avgDqScore - a[1].avgDqScore);

    const suggestedModel = modelPerf[0]?.[0];

    const avgConfidence = successPatterns.reduce((s, p) => s + p.confidence, 0) / successPatterns.length;

    return {
      suggestedModel,
      suggestedSubsystems: suggestedSubsystems.length > 0 ? suggestedSubsystems : subsystems,
      confidence: avgConfidence,
      reasoning: `Based on ${successPatterns.length} successful similar tasks`,
    };
  }

  // ===========================================================================
  // MODEL PERFORMANCE
  // ===========================================================================

  /**
   * Get model performance summary
   */
  getModelPerformance(modelId: string): ModelPerformanceRecord | undefined {
    return this.modelPerformance.get(modelId);
  }

  /**
   * Get best model for a task type
   */
  getBestModelForTask(taskType: string): string | undefined {
    let bestModel: string | undefined;
    let bestScore = 0;

    for (const [modelId, perf] of Array.from(this.modelPerformance.entries())) {
      if (perf.taskTypes.has(taskType)) {
        const score = perf.avgDqScore * perf.successRate;
        if (score > bestScore) {
          bestScore = score;
          bestModel = modelId;
        }
      }
    }

    return bestModel;
  }

  /**
   * Get all model performance records
   */
  getAllModelPerformance(): ModelPerformanceRecord[] {
    return Array.from(this.modelPerformance.values());
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get learning statistics
   */
  getStats(): {
    totalPatterns: number;
    patternsByType: Record<PatternType, number>;
    avgPatternConfidence: number;
    modelsTracked: number;
    feedbackProcessed: number;
  } {
    const patternsByType: Record<PatternType, number> = {
      success: 0,
      failure: 0,
      escalation: 0,
      optimization: 0,
    };

    let totalConfidence = 0;
    for (const pattern of Array.from(this.patterns.values())) {
      patternsByType[pattern.type]++;
      totalConfidence += pattern.confidence;
    }

    return {
      totalPatterns: this.patterns.size,
      patternsByType,
      avgPatternConfidence: this.patterns.size > 0 ? totalConfidence / this.patterns.size : 0,
      modelsTracked: this.modelPerformance.size,
      feedbackProcessed: this.feedbackHistory.length,
    };
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private extractContext(feedback: TaskFeedback): PatternContext {
    return {
      goalType: this.inferGoalType(feedback.goalText),
      complexity: this.inferComplexity(feedback),
      subsystemsInvolved: feedback.subsystemsUsed,
      keywords: this.extractKeywords(feedback.goalText),
      contextHash: this.hashContext({
        goalText: feedback.goalText,
        modelUsed: feedback.modelUsed,
      }),
    };
  }

  private extractOutcome(feedback: TaskFeedback): PatternOutcome {
    return {
      success: feedback.success,
      dqScore: feedback.dqScore,
      latencyMs: feedback.latencyMs,
      tokenCost: feedback.tokenCost,
      humanIntervention: feedback.humanIntervention,
    };
  }

  private updatePatterns(context: PatternContext, outcome: PatternOutcome): void {
    const existingKey = context.contextHash;
    const existing = this.patterns.get(existingKey);

    if (existing) {
      // Update existing pattern with exponential moving average
      const lr = this.config.patternLearningRate;
      existing.outcome.dqScore = existing.outcome.dqScore * (1 - lr) + outcome.dqScore * lr;
      existing.outcome.latencyMs = existing.outcome.latencyMs * (1 - lr) + outcome.latencyMs * lr;
      existing.outcome.success = outcome.success; // Latest
      existing.frequency++;
      existing.lastSeen = Date.now();

      // Update confidence based on frequency
      existing.confidence = Math.min(0.95, existing.confidence + 0.05);
    } else {
      // Create new pattern
      const pattern: Pattern = {
        id: generateId('pat'),
        type: outcome.success ? 'success' : 'failure',
        context,
        outcome,
        confidence: 0.5,
        frequency: 1,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      this.storePattern(pattern);
    }
  }

  private storePattern(pattern: Pattern): void {
    // Evict old patterns if at capacity
    if (this.patterns.size >= this.config.maxPatterns) {
      this.evictOldestPattern();
    }

    this.patterns.set(pattern.context.contextHash, pattern);
  }

  private evictOldestPattern(): void {
    let oldest: string | undefined;
    let oldestTime = Date.now();

    for (const [key, pattern] of Array.from(this.patterns.entries())) {
      if (pattern.lastSeen < oldestTime) {
        oldestTime = pattern.lastSeen;
        oldest = key;
      }
    }

    if (oldest) {
      this.patterns.delete(oldest);
    }
  }

  private updateModelPerformance(feedback: TaskFeedback): void {
    const record = this.modelPerformance.get(feedback.modelUsed) ?? {
      modelId: feedback.modelUsed,
      totalInvocations: 0,
      successCount: 0,
      avgDqScore: 0,
      avgLatencyMs: 0,
      successRate: 1.0,
      taskTypes: new Set<string>(),
    };

    const n = record.totalInvocations;
    const lr = this.config.modelLearningRate;

    record.avgDqScore = record.avgDqScore * (1 - lr) + feedback.dqScore * lr;
    record.avgLatencyMs = record.avgLatencyMs * (1 - lr) + feedback.latencyMs * lr;
    record.totalInvocations = n + 1;
    record.successCount += feedback.success ? 1 : 0;
    record.successRate = record.successCount / record.totalInvocations;
    record.taskTypes.add(this.inferGoalType(feedback.goalText));

    this.modelPerformance.set(feedback.modelUsed, record);
  }

  private calculatePatternMatch(
    pattern: Pattern,
    goalType: string,
    complexity: number,
    subsystems: SubsystemType[]
  ): number {
    let score = 0;

    // Goal type match
    if (pattern.context.goalType === goalType) score += 0.4;

    // Complexity similarity
    const complexityDiff = Math.abs(pattern.context.complexity - complexity);
    score += (1 - complexityDiff) * 0.3;

    // Subsystem overlap
    const patternSubsystems = new Set(pattern.context.subsystemsInvolved);
    const overlap = subsystems.filter((s) => patternSubsystems.has(s)).length;
    const maxLen = Math.max(subsystems.length, patternSubsystems.size);
    if (maxLen > 0) {
      score += (overlap / maxLen) * 0.3;
    }

    return score;
  }

  private inferGoalType(goalText: string): string {
    const text = goalText.toLowerCase();

    if (text.includes('implement') || text.includes('add') || text.includes('create')) {
      return 'implementation';
    }
    if (text.includes('fix') || text.includes('bug') || text.includes('error')) {
      return 'bugfix';
    }
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize')) {
      return 'refactor';
    }
    if (text.includes('test') || text.includes('verify') || text.includes('check')) {
      return 'testing';
    }
    if (text.includes('research') || text.includes('analyze') || text.includes('investigate')) {
      return 'research';
    }

    return 'general';
  }

  private inferComplexity(feedback: TaskFeedback): number {
    // Estimate complexity from task characteristics
    let complexity = 0.5;

    if (feedback.subsystemsUsed.length > 2) complexity += 0.1;
    if (feedback.tokenCost > 10000) complexity += 0.15;
    if (feedback.humanIntervention) complexity += 0.15;
    if (feedback.latencyMs > 30000) complexity += 0.1;

    return Math.min(1, complexity);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }

  private hashContext(context: Record<string, unknown>): string {
    const str = JSON.stringify(context);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ctx_${Math.abs(hash).toString(16)}`;
  }
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface ModelPerformanceRecord {
  modelId: string;
  totalInvocations: number;
  successCount: number;
  avgDqScore: number;
  avgLatencyMs: number;
  successRate: number;
  taskTypes: Set<string>;
}

// =============================================================================
// SINGLETON
// =============================================================================

let learnerInstance: FeedbackLearner | null = null;

export function getFeedbackLearner(config?: Partial<LearnerConfig>): FeedbackLearner {
  if (!learnerInstance) {
    learnerInstance = new FeedbackLearner(config);
  }
  return learnerInstance;
}
