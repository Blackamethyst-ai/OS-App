/**
 * CPB (Cognitive Precision Bridge) Routing for Capabilities
 *
 * Provides query routing and execution through CPB paths.
 * Migrated from unifiedActionRegistry.ts for Phase 2 consolidation.
 *
 * Execution Paths:
 * - direct: Fast, simple queries (navigation, status)
 * - rlm: Long context requiring compression
 * - ace: Multi-agent consensus (architecture decisions)
 * - hybrid: RLM + ACE (complex analysis with long context)
 * - cascade: Full verification (critical decisions)
 */

import { cpbExecutePath, extractPathSignals, selectPath } from '../cognitivePrecisionBridge';
import type { CPBPath, CPBRequest, CPBResult, CPBStatus, PathSignals } from '../cognitivePrecisionBridge/types';
import type { Capability, CapabilityComplexity } from './types';
import { searchCapabilities, getCapability, executeCapability } from './registry';

// Re-export CPB types for convenience
export type { CPBPath, CPBResult, CPBStatus, PathSignals };

// ============================================================================
// Complexity to CPB Path Mapping
// ============================================================================

const COMPLEXITY_TO_PATH: Record<CapabilityComplexity, CPBPath | 'auto'> = {
  simple: 'direct',
  navigation: 'direct',
  analysis: 'ace',
  architecture: 'hybrid',
  critical: 'cascade',
};

// ============================================================================
// Execution Result Type
// ============================================================================

export interface CPBExecutionResult {
  success: boolean;
  capabilityId?: string;
  output: unknown;
  executionPath: CPBPath | 'auto';
  dqScore?: number;
  executionTimeMs: number;
  error?: string;
}

// ============================================================================
// Query Routing
// ============================================================================

export interface QueryRouteResult {
  path: CPBPath;
  reasoning: string;
  confidence: number;
  matchedCapabilities: Capability[];
}

/**
 * Route a query to the optimal CPB execution path
 *
 * Uses capability matching and CPB signal extraction to determine
 * the best path for query execution.
 */
export function routeQueryToCPB(query: string, context?: string): QueryRouteResult {
  // Find matching capabilities
  const matches = searchCapabilities(query, { limit: 5 });
  const matchedCapabilities = matches.map((m) => m.capability);

  // If we have a direct capability match with known complexity, use its path
  if (matchedCapabilities.length > 0) {
    const topCapability = matchedCapabilities[0];
    const executionPath = topCapability.executionPath;

    if (executionPath !== 'auto') {
      return {
        path: executionPath as CPBPath,
        reasoning: `Matched capability "${topCapability.id}" with complexity "${topCapability.complexity}"`,
        confidence: 0.85,
        matchedCapabilities,
      };
    }

    // Auto path - derive from complexity
    const derivedPath = COMPLEXITY_TO_PATH[topCapability.complexity];
    if (derivedPath !== 'auto') {
      return {
        path: derivedPath,
        reasoning: `Derived path from capability "${topCapability.id}" complexity "${topCapability.complexity}"`,
        confidence: 0.75,
        matchedCapabilities,
      };
    }
  }

  // Fall back to CPB's path selection
  const signals = extractPathSignals({ query, context });
  const decision = selectPath(signals as unknown as CPBRequest);

  return {
    path: (decision as { path?: CPBPath }).path || 'direct',
    reasoning: decision.reasoning,
    confidence: decision.confidence,
    matchedCapabilities,
  };
}

// ============================================================================
// Query Execution
// ============================================================================

/**
 * Execute a query through CPB with optimal routing
 *
 * Routes the query to the appropriate CPB path and executes it.
 * For capability-matched queries with simple/navigation complexity,
 * executes directly through the capability handler.
 */
export async function executeQueryWithCPB(
  query: string,
  context?: string,
  onStatus?: (status: CPBStatus) => void
): Promise<CPBExecutionResult> {
  const routing = routeQueryToCPB(query, context);
  const startTime = Date.now();

  try {
    // If we matched a specific capability, try direct execution
    if (routing.matchedCapabilities.length > 0 && routing.confidence > 0.8) {
      const capability = routing.matchedCapabilities[0];

      // For simple/navigation capabilities, execute directly
      if (capability.complexity === 'simple' || capability.complexity === 'navigation') {
        const result = await executeCapability(capability.id, { query, context });
        return {
          success: result.success,
          capabilityId: capability.id,
          output: result.result,
          executionPath: 'direct',
          executionTimeMs: result.timing || Date.now() - startTime,
          error: result.error,
        };
      }
    }

    // Route through CPB for complex queries
    const cpbResult: CPBResult = await cpbExecutePath(routing.path, query, context, onStatus);

    return {
      success: true,
      capabilityId: routing.matchedCapabilities[0]?.id || 'cpb_query',
      output: cpbResult.output,
      executionPath: cpbResult.path,
      dqScore: cpbResult.dqScore.score,
      executionTimeMs: cpbResult.executionTimeMs,
    };
  } catch (error) {
    return {
      success: false,
      capabilityId: routing.matchedCapabilities[0]?.id || 'cpb_query',
      output: null,
      executionPath: routing.path,
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute a specific capability with CPB routing
 *
 * Executes a capability by ID, routing through CPB based on
 * the capability's complexity level.
 */
export async function executeCapabilityWithCPB(
  capabilityId: string,
  args: Record<string, unknown> = {},
  onStatus?: (status: CPBStatus) => void
): Promise<CPBExecutionResult> {
  const capability = getCapability(capabilityId);
  const startTime = Date.now();

  if (!capability) {
    return {
      success: false,
      capabilityId,
      output: null,
      executionPath: 'direct',
      executionTimeMs: Date.now() - startTime,
      error: `Capability "${capabilityId}" not found`,
    };
  }

  try {
    // For simple capabilities, execute directly
    if (
      capability.complexity === 'simple' ||
      capability.complexity === 'navigation' ||
      capability.executionPath === 'direct'
    ) {
      const result = await executeCapability(capabilityId, args);
      return {
        success: result.success,
        capabilityId,
        output: result.result,
        executionPath: 'direct',
        executionTimeMs: result.timing || Date.now() - startTime,
        error: result.error,
      };
    }

    // Determine CPB path
    const path =
      capability.executionPath === 'auto'
        ? COMPLEXITY_TO_PATH[capability.complexity]
        : capability.executionPath;

    // Execute through CPB
    const cpbResult = await cpbExecutePath(
      path as CPBPath,
      `Execute capability: ${capability.description}`,
      JSON.stringify(args),
      onStatus
    );

    // Also execute the actual capability handler
    const capabilityResult = await executeCapability(capabilityId, args);

    return {
      success: capabilityResult.success,
      capabilityId,
      output: { capabilityResult: capabilityResult.result, cpbOutput: cpbResult.output },
      executionPath: cpbResult.path,
      dqScore: cpbResult.dqScore.score,
      executionTimeMs: Date.now() - startTime,
      error: capabilityResult.error,
    };
  } catch (error) {
    const executionPath =
      capability.executionPath === 'auto' ? 'direct' : (capability.executionPath as CPBPath);

    return {
      success: false,
      capabilityId,
      output: null,
      executionPath,
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
