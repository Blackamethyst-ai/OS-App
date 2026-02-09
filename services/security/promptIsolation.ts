/**
 * Prompt Isolation Layer
 *
 * Prevents direct access to system prompts by providing
 * sanitized versions for agent execution.
 *
 * Security: Mitigates prompt extraction attacks (arXiv:2601.21233)
 */

import type { HiveAgent } from '../../types';
import { HIVE_AGENTS } from '../agents';
import { securityAudit } from './auditLog';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Isolated agent representation with NO systemPrompt exposure
 */
export interface IsolatedAgent {
  id: string;
  name: string;
  archetype: string;
  behaviorSummary: string; // High-level description only
  capabilities: string[];
  weights?: {
    skepticism: number;
    logic: number;
    creativity: number;
    empathy: number;
  };
}

/**
 * Secure prompt reference for internal use only
 */
interface SecurePromptReference {
  agentId: string;
  promptHash: string; // SHA-256 of prompt for verification
  accessibleBy: 'system' | 'admin'; // Who can access raw prompt
}

// =============================================================================
// ISOLATION FUNCTIONS
// =============================================================================

/**
 * Convert HiveAgent to IsolatedAgent (removes systemPrompt)
 */
export function isolateAgent(agent: HiveAgent): IsolatedAgent {
  return {
    id: agent.id,
    name: agent.name,
    archetype: agent.archetype || 'General Agent',
    behaviorSummary: generateBehaviorSummary(agent),
    capabilities: agent.expertise || [],
    weights: agent.weights, // Cognitive weights are safe to expose
  };
}

/**
 * Generate high-level behavior summary without exposing prompt details
 */
function generateBehaviorSummary(agent: HiveAgent): string {
  const { archetype, expertise } = agent;
  const primaryExpertise = expertise?.[0] || 'general tasks';

  const summaries: Record<string, string> = {
    'The Sentinel': `Security-focused agent specializing in ${primaryExpertise}`,
    'The Builder': `Creative agent focused on ${primaryExpertise}`,
    'The Executor': `Execution-oriented agent handling ${primaryExpertise}`,
    'The Strategist': `Strategic planning agent for ${primaryExpertise}`,
    'The Operator': `Operations agent managing ${primaryExpertise}`,
  };

  return summaries[archetype || ''] || `Agent specialized in ${primaryExpertise}`;
}

/**
 * Get all agents in isolated form
 */
export function getIsolatedAgents(): Record<string, IsolatedAgent> {
  const isolated: Record<string, IsolatedAgent> = {};

  for (const [key, agent] of Object.entries(HIVE_AGENTS)) {
    isolated[key] = isolateAgent(agent);
  }

  return isolated;
}

/**
 * Get single isolated agent by ID
 */
export function getIsolatedAgent(agentId: string): IsolatedAgent | null {
  const agent = HIVE_AGENTS[agentId];
  if (!agent) return null;

  return isolateAgent(agent);
}

// =============================================================================
// SECURE PROMPT ACCESS (SYSTEM USE ONLY)
// =============================================================================

/**
 * Get actual system prompt for LLM execution
 *
 * SECURITY: This function should ONLY be called by trusted system components
 * (geminiService, claudeService, etc.) and NEVER exposed to agents themselves.
 */
export function getSystemPrompt(agentId: string, caller: 'system' | 'admin'): string | null {
  // In production, verify caller identity via cryptographic signature
  // For now, trust-based access control

  const agent = HIVE_AGENTS[agentId];
  if (!agent) return null;

  // Log access for audit trail
  logPromptAccess(agentId, caller);

  return agent.systemPrompt;
}

/**
 * Log prompt access for security audit
 */
function logPromptAccess(agentId: string, caller: string): void {
  securityAudit.log('prompt_access', { agentId, caller });
}

// =============================================================================
// HASH VERIFICATION
// =============================================================================

/**
 * Compute hash of system prompt for integrity verification
 */
export async function computePromptHash(agentId: string): Promise<string> {
  const agent = HIVE_AGENTS[agentId];
  if (!agent) return '';

  const encoder = new TextEncoder();
  const data = encoder.encode(agent.systemPrompt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify prompt hasn't been tampered with
 */
export async function verifyPromptIntegrity(
  agentId: string,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await computePromptHash(agentId);
  return actualHash === expectedHash;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an object contains systemPrompt field (potential leak)
 */
export function containsSystemPrompt(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;

  const jsonStr = JSON.stringify(obj);
  return jsonStr.includes('systemPrompt') || jsonStr.includes('COGNITIVE PROFILE');
}

/**
 * Sanitize object by removing systemPrompt fields
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = JSON.parse(JSON.stringify(obj));

  function removePrompts(o: any): void {
    if (typeof o !== 'object' || o === null) return;

    if ('systemPrompt' in o) {
      delete o.systemPrompt;
    }

    for (const key in o) {
      if (typeof o[key] === 'object') {
        removePrompts(o[key]);
      }
    }
  }

  removePrompts(sanitized);
  return sanitized as T;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  isolateAgent,
  getIsolatedAgents,
  getIsolatedAgent,
  getSystemPrompt,
  computePromptHash,
  verifyPromptIntegrity,
  containsSystemPrompt,
  sanitizeObject,
};
