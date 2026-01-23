/**
 * ARCHON Utilities
 *
 * Common utility functions for the meta-orchestrator.
 */

// =============================================================================
// ID GENERATION
// =============================================================================

let idCounter = 0;

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = 'archon'): string {
  const timestamp = Date.now().toString(36);
  const counter = (idCounter++).toString(36).padStart(4, '0');
  const random = crypto.randomUUID().slice(0, 4);
  return `${prefix}_${timestamp}_${counter}_${random}`;
}

/**
 * Generate a hash from a string (for context matching)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// =============================================================================
// COMPLEXITY ESTIMATION
// =============================================================================

/**
 * Estimate goal complexity based on text analysis
 * Returns 0-1 score (higher = more complex)
 */
export function estimateGoalComplexity(goalText: string): number {
  const text = goalText.toLowerCase();
  let score = 0;

  // Length-based complexity
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 50) score += 0.2;
  else if (wordCount > 20) score += 0.1;

  // Complexity indicators
  const complexIndicators = [
    /architect|design|refactor|optimize/i,
    /multi|several|multiple|all/i,
    /integrate|coordinate|orchestrate/i,
    /research|analyze|investigate/i,
    /test|validate|verify|ensure/i,
  ];

  for (const pattern of complexIndicators) {
    if (pattern.test(text)) score += 0.15;
  }

  // Simplicity indicators (reduce complexity)
  const simpleIndicators = [
    /fix typo|rename|update comment/i,
    /simple|quick|small|minor/i,
    /single|one|just/i,
  ];

  for (const pattern of simpleIndicators) {
    if (pattern.test(text)) score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

// =============================================================================
// SUBSYSTEM INFERENCE
// =============================================================================

import { SubsystemType } from './types';

/**
 * Infer which subsystems might be needed for a goal
 */
export function inferSubsystems(goalText: string): SubsystemType[] {
  const text = goalText.toLowerCase();
  const subsystems: SubsystemType[] = [];

  // ACE: Complex reasoning, consensus needed
  if (/architect|design|decide|choose|evaluate|compare/i.test(text)) {
    subsystems.push('ace');
  }

  // Evolution: Code changes
  if (/implement|build|create|add|fix|refactor|update code/i.test(text)) {
    subsystems.push('evolution');
  }

  // Dream: Research, background processing
  if (/research|investigate|find|discover|explore|analyze/i.test(text)) {
    subsystems.push('dream');
  }

  // Voice: Natural language heavy
  if (/explain|describe|tell|speak|voice/i.test(text)) {
    subsystems.push('voice');
  }

  // CPB: Reasoning paths, verification
  if (/verify|validate|ensure|check|confirm/i.test(text)) {
    subsystems.push('cpb');
  }

  // Always include DQ for quality gating
  if (!subsystems.includes('dq')) {
    subsystems.push('dq');
  }

  // Always include kernel for coordination
  if (!subsystems.includes('kernel')) {
    subsystems.push('kernel');
  }

  return subsystems;
}

// =============================================================================
// TOKEN COST ESTIMATION
// =============================================================================

/**
 * Estimate token cost for a task
 */
export function estimateTokenCost(
  complexity: number,
  subsystemCount: number,
  includesConsensus: boolean
): number {
  // Base tokens
  let tokens = 1000;

  // Complexity multiplier
  tokens += complexity * 5000;

  // Per-subsystem overhead
  tokens += subsystemCount * 500;

  // Consensus is expensive
  if (includesConsensus) {
    tokens *= 3; // ACE runs multiple agents
  }

  return Math.round(tokens);
}

// =============================================================================
// DQ HELPERS
// =============================================================================

/**
 * Calculate weighted DQ score from components
 */
export function calculateDQ(validity: number, specificity: number, correctness: number): number {
  return validity * 0.4 + specificity * 0.3 + correctness * 0.3;
}

/**
 * Check if a DQ score meets the actionability threshold
 */
export function isActionable(dqScore: number, threshold = 0.7): boolean {
  return dqScore >= threshold;
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Get relative time string
 */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Exponential backoff delay
 */
export function backoffDelay(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  // Add jitter (±10%)
  return delay * (0.9 + Math.random() * 0.2);
}

/**
 * Wait for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// LOGGING
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // Gray
  info: '\x1b[36m',   // Cyan
  warn: '\x1b[33m',   // Yellow
  error: '\x1b[31m',  // Red
};

const RESET = '\x1b[0m';

export function archonLog(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `${LOG_COLORS[level]}[ARCHON:${level.toUpperCase()}]${RESET}`;

  if (import.meta.env.DEV) {
    if (data) {
      console.log(`${prefix} ${timestamp} - ${message}`, data);
    } else {
      console.log(`${prefix} ${timestamp} - ${message}`);
    }
  }
}
