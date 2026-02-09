/**
 * Prompt Access Monitor
 *
 * Detects and logs potential prompt extraction attempts.
 *
 * Security: Implements detection for "Just Ask" attacks (arXiv:2601.21233)
 */

import { securityAudit } from './auditLog';

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractionAttempt {
  id: string;
  agentId: string;
  query: string;
  timestamp: number;
  confidence: number; // 0-1, how confident we are this is an attack
  matchedPatterns: string[];
}

export interface SecurityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'extraction_attempt' | 'prompt_leakage' | 'unauthorized_access';
  attempt: ExtractionAttempt;
  action: 'logged' | 'blocked' | 'sanitized';
}

// =============================================================================
// DETECTION PATTERNS
// =============================================================================

/**
 * Suspicious query patterns that may indicate extraction attempts
 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; confidence: number; name: string }> = [
  // Direct prompt requests
  { pattern: /system\s*prompt/i, confidence: 0.95, name: 'direct_prompt_request' },
  { pattern: /what.*instructions.*given/i, confidence: 0.90, name: 'instruction_query' },
  { pattern: /show.*your.*prompt/i, confidence: 0.95, name: 'show_prompt' },
  { pattern: /tell.*about.*directives/i, confidence: 0.85, name: 'directive_query' },

  // Cognitive profile extraction
  { pattern: /cognitive\s*profile/i, confidence: 0.85, name: 'cognitive_profile' },
  { pattern: /behavioral\s*directive/i, confidence: 0.85, name: 'behavioral_directive' },
  { pattern: /decision\s*framework/i, confidence: 0.80, name: 'decision_framework' },
  { pattern: /reasoning\s*template/i, confidence: 0.85, name: 'reasoning_template' },

  // Agent configuration queries
  { pattern: /what.*other.*agents/i, confidence: 0.75, name: 'agent_enumeration' },
  { pattern: /list.*all.*agents/i, confidence: 0.80, name: 'agent_listing' },
  { pattern: /describe.*your.*archetype/i, confidence: 0.70, name: 'archetype_query' },
  { pattern: /how.*you.*configured/i, confidence: 0.75, name: 'configuration_query' },

  // Reflection attacks
  { pattern: /reflect.*on.*your\s*(role|purpose|function)/i, confidence: 0.65, name: 'reflection_attack' },
  { pattern: /explain.*your.*behavior/i, confidence: 0.60, name: 'behavior_explanation' },
  { pattern: /what.*makes.*you.*different/i, confidence: 0.50, name: 'differentiation_query' },

  // Meta-prompting
  { pattern: /ignore.*previous.*instructions/i, confidence: 0.90, name: 'ignore_previous' },
  { pattern: /disregard.*above/i, confidence: 0.85, name: 'disregard_above' },
  { pattern: /repeat.*above\s*(text|instructions)/i, confidence: 0.90, name: 'repeat_above' },

  // System internals
  { pattern: /internal\s*(configuration|settings)/i, confidence: 0.80, name: 'internal_config' },
  { pattern: /hidden\s*(instructions|rules)/i, confidence: 0.85, name: 'hidden_instructions' },
  { pattern: /secret\s*(prompt|directive)/i, confidence: 0.90, name: 'secret_prompt' },
];

/**
 * Patterns in responses that indicate prompt leakage
 */
const LEAKAGE_PATTERNS: Array<{ pattern: RegExp; confidence: number; name: string }> = [
  { pattern: /COGNITIVE PROFILE:/i, confidence: 0.95, name: 'profile_leak' },
  { pattern: /BEHAVIORAL DIRECTIVES:/i, confidence: 0.95, name: 'directive_leak' },
  { pattern: /REASONING TEMPLATE:/i, confidence: 0.95, name: 'template_leak' },
  { pattern: /Primary Mode:/i, confidence: 0.85, name: 'mode_leak' },
  { pattern: /Decision Framework:/i, confidence: 0.85, name: 'framework_leak' },
  { pattern: /Communication Style:/i, confidence: 0.80, name: 'style_leak' },
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect if query is a potential extraction attempt
 */
export function detectExtractionAttempt(
  query: string,
  agentId: string = 'unknown'
): ExtractionAttempt | null {
  const matches: Array<{ pattern: string; confidence: number }> = [];
  let maxConfidence = 0;

  for (const { pattern, confidence, name } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(query)) {
      matches.push({ pattern: name, confidence });
      maxConfidence = Math.max(maxConfidence, confidence);
    }
  }

  // Threshold: Only report if confidence >= 0.5
  if (maxConfidence < 0.5) return null;

  const attempt: ExtractionAttempt = {
    id: generateAttemptId(),
    agentId,
    query: query.substring(0, 200), // Truncate for logging
    timestamp: Date.now(),
    confidence: maxConfidence,
    matchedPatterns: matches.map(m => m.pattern),
  };

  return attempt;
}

/**
 * Detect if response contains prompt leakage
 */
export function detectPromptLeakage(response: string): boolean {
  for (const { pattern } of LEAKAGE_PATTERNS) {
    if (pattern.test(response)) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitize response by removing leaked prompt fragments
 */
export function sanitizeResponse(response: string): string {
  let sanitized = response;

  // Remove leaked prompt sections
  sanitized = sanitized.replace(/COGNITIVE PROFILE:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '[REDACTED]');
  sanitized = sanitized.replace(/BEHAVIORAL DIRECTIVES:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '[REDACTED]');
  sanitized = sanitized.replace(/REASONING TEMPLATE:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '[REDACTED]');

  // Remove reasoning step details
  sanitized = sanitized.replace(/Primary Mode:.*?$/gm, '[REDACTED]');
  sanitized = sanitized.replace(/Decision Framework:.*?$/gm, '[REDACTED]');

  return sanitized;
}

// =============================================================================
// LOGGING & ALERTING
// =============================================================================

/**
 * Log extraction attempt for security audit
 */
export function logExtractionAttempt(attempt: ExtractionAttempt): SecurityAlert {
  const severity = getSeverity(attempt.confidence);

  const alert: SecurityAlert = {
    severity,
    type: 'extraction_attempt',
    attempt,
    action: severity === 'critical' ? 'blocked' : 'logged',
  };

  securityAudit.log('extraction_attempt', { severity, attempt });

  return alert;
}

/**
 * Log prompt leakage in response
 */
export function logPromptLeakage(
  agentId: string,
  query: string,
  response: string
): SecurityAlert {
  const attempt: ExtractionAttempt = {
    id: generateAttemptId(),
    agentId,
    query: query.substring(0, 200),
    timestamp: Date.now(),
    confidence: 1.0, // Leakage detected = high confidence
    matchedPatterns: ['prompt_leakage_detected'],
  };

  const alert: SecurityAlert = {
    severity: 'critical',
    type: 'prompt_leakage',
    attempt,
    action: 'sanitized',
  };

  securityAudit.log('prompt_leakage', { agentId, query: query.substring(0, 50), responseLength: response.length });

  return alert;
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function getSeverity(confidence: number): SecurityAlert['severity'] {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Get statistics on extraction attempts
 */
export function getExtractionStats(): {
  totalAttempts: number;
  bySeverity: Record<string, number>;
  byAgent: Record<string, number>;
} {
  const allEntries = securityAudit.getEntries().filter(e => e.type === 'extraction_attempt');
  const bySeverity: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  for (const entry of allEntries) {
    const sev = entry.data.severity as string;
    const attempt = entry.data.attempt as ExtractionAttempt;
    bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    byAgent[attempt.agentId] = (byAgent[attempt.agentId] || 0) + 1;
  }
  return { totalAttempts: allEntries.length, bySeverity, byAgent };
}

// =============================================================================
// MIDDLEWARE INTEGRATION
// =============================================================================

/**
 * Middleware to check queries before LLM execution
 */
export function secureQueryMiddleware(
  query: string,
  agentId: string,
  onAlert?: (alert: SecurityAlert) => void
): { allowed: boolean; sanitizedQuery?: string } {
  const attempt = detectExtractionAttempt(query, agentId);

  if (!attempt) {
    return { allowed: true };
  }

  const alert = logExtractionAttempt(attempt);

  if (onAlert) {
    onAlert(alert);
  }

  // Block critical attempts
  if (alert.severity === 'critical') {
    return { allowed: false };
  }

  // Allow with monitoring
  return { allowed: true, sanitizedQuery: query };
}

/**
 * Middleware to check responses for prompt leakage
 */
export function secureResponseMiddleware(
  response: string,
  agentId: string,
  query: string,
  onAlert?: (alert: SecurityAlert) => void
): { response: string; leaked: boolean } {
  const leaked = detectPromptLeakage(response);

  if (!leaked) {
    return { response, leaked: false };
  }

  const alert = logPromptLeakage(agentId, query, response);

  if (onAlert) {
    onAlert(alert);
  }

  const sanitized = sanitizeResponse(response);

  return { response: sanitized, leaked: true };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  detectExtractionAttempt,
  detectPromptLeakage,
  sanitizeResponse,
  logExtractionAttempt,
  logPromptLeakage,
  getExtractionStats,
  secureQueryMiddleware,
  secureResponseMiddleware,
};
