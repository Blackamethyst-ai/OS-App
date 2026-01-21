/**
 * ARCHON Configuration
 *
 * Centralized configuration for the autonomous meta-orchestrator.
 * User preferences: Aggressive autonomy, Quality first, SQLite persistence.
 */

import { ArchonConfig, SubsystemType, ModelTier } from './types';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONFIG: ArchonConfig = {
  // Autonomy settings (AGGRESSIVE - per user preference)
  maxRetries: 5,
  escalationThreshold: 5,  // Only escalate after 5 failed attempts
  dqTarget: 0.55,          // Lowered from 0.7 - real subsystems often score 0.6-0.65

  // Resource settings
  totalTokenBudget: 1_000_000, // 1M tokens per session
  subsystemBudgetRatios: new Map<SubsystemType, number>([
    ['ace', 0.30],         // ACE gets 30% - most expensive (consensus)
    ['cpb', 0.25],         // CPB gets 25% - reasoning paths
    ['evolution', 0.15],   // Evolution gets 15% - code generation
    ['dream', 0.10],       // Dream gets 10% - background research
    ['kernel', 0.10],      // Kernel gets 10% - coordination
    ['voice', 0.05],       // Voice gets 5% - input processing
    ['dq', 0.05],          // DQ gets 5% - scoring
  ]),
  defaultModel: 'flagship',  // Performance-first default

  // Learning settings
  learningEnabled: true,
  patternMatchThreshold: 0.7,
  feedbackWeight: 0.3,

  // Persistence (SQLite via ResearchGravity)
  persistenceEnabled: true,
  dbPath: '~/.agent-core/storage/antigravity.db',
};

// =============================================================================
// MODEL PRICING (for cost estimation)
// =============================================================================

export const MODEL_COSTS: Record<ModelTier, { input: number; output: number }> = {
  fast: { input: 0.00025, output: 0.00125 },      // $0.25/$1.25 per 1M tokens (Haiku-class)
  standard: { input: 0.003, output: 0.015 },      // $3/$15 per 1M tokens (Sonnet-class)
  flagship: { input: 0.015, output: 0.075 },      // $15/$75 per 1M tokens (Opus-class)
  local: { input: 0, output: 0 },                 // Free (local models)
};

// =============================================================================
// COMPLEXITY THRESHOLDS
// =============================================================================

export const COMPLEXITY_THRESHOLDS = {
  // Below this: Use haiku
  SIMPLE: 0.3,
  // Below this: Use sonnet
  MODERATE: 0.7,
  // Above MODERATE: Use opus or ACE
};

// =============================================================================
// SUBSYSTEM CAPABILITIES
// =============================================================================

export const SUBSYSTEM_CAPABILITIES: Record<SubsystemType, string[]> = {
  ace: [
    'multi-agent-consensus',
    'complex-decision-making',
    'voting-based-resolution',
    'quality-verification',
    'architectural-decisions',
  ],
  dq: [
    'quality-scoring',
    'validity-assessment',
    'specificity-measurement',
    'correctness-evaluation',
    'actionability-check',
  ],
  dream: [
    'background-research',
    'pattern-discovery',
    'insight-generation',
    'idle-processing',
    'morning-briefing',
  ],
  evolution: [
    'code-generation',
    'refactoring',
    'friction-detection',
    'self-modification',
    'migration-planning',
  ],
  kernel: [
    'task-dispatch',
    'priority-scheduling',
    'biometric-response',
    'ui-regeneration',
    'intent-resolution',
  ],
  voice: [
    'voice-input',
    'natural-language-parsing',
    'complexity-routing',
    'multi-provider-orchestration',
    'real-time-transcription',
  ],
  cpb: [
    'reasoning-path-selection',
    'context-compression',
    'recursive-decomposition',
    'quality-verification',
    'hybrid-reasoning',
  ],
};

// =============================================================================
// ESCALATION SETTINGS
// =============================================================================

export const ESCALATION_CONFIG = {
  // Number of options to present to user
  maxOptions: 3,

  // Time limit before auto-escalating stuck tasks
  autoEscalateAfterMs: 5 * 60 * 1000, // 5 minutes

  // DQ threshold below which we consider retrying
  retryThreshold: 0.5,

  // DQ threshold at which we're confident enough to proceed
  confidenceThreshold: 0.85,
};

// =============================================================================
// PATTERN MATCHING
// =============================================================================

export const PATTERN_CONFIG = {
  // Minimum confidence to use a learned pattern
  minConfidence: 0.7,

  // How much to weight recent patterns
  recencyWeight: 0.8,

  // Maximum age of patterns to consider (days)
  maxPatternAgeDays: 30,

  // Minimum frequency for a pattern to be considered reliable
  minFrequency: 3,
};

// =============================================================================
// TELEMETRY SETTINGS
// =============================================================================

export const TELEMETRY_CONFIG = {
  // Enable detailed logging
  verbose: process.env.NODE_ENV === 'development',

  // Log all decisions
  logDecisions: true,

  // Log subsystem invocations
  logInvocations: true,

  // Track token usage
  trackTokens: true,

  // Emit events for external monitoring
  emitEvents: true,
};

// =============================================================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// =============================================================================

export function getConfig(overrides?: Partial<ArchonConfig>): ArchonConfig {
  const baseConfig = { ...DEFAULT_CONFIG };

  // Apply environment-specific defaults
  if (process.env.NODE_ENV === 'development') {
    // More verbose in dev
    baseConfig.maxRetries = 3; // Faster iteration in dev
  }

  // Apply user overrides
  if (overrides) {
    Object.assign(baseConfig, overrides);
  }

  return baseConfig;
}

// =============================================================================
// VALIDATION
// =============================================================================

export function validateConfig(config: ArchonConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxRetries < 1 || config.maxRetries > 10) {
    errors.push('maxRetries must be between 1 and 10');
  }

  if (config.dqTarget < 0 || config.dqTarget > 1) {
    errors.push('dqTarget must be between 0 and 1');
  }

  if (config.totalTokenBudget < 10000) {
    errors.push('totalTokenBudget must be at least 10,000');
  }

  // Validate budget ratios sum to ~1
  let ratioSum = 0;
  config.subsystemBudgetRatios.forEach((ratio) => {
    ratioSum += ratio;
  });
  if (Math.abs(ratioSum - 1) > 0.01) {
    errors.push(`Subsystem budget ratios must sum to 1, got ${ratioSum}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// EXPORT
// =============================================================================

export default DEFAULT_CONFIG;
