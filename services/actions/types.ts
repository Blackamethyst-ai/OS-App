/**
 * ACTION REGISTRY TYPES
 *
 * Unified type definitions for the action registry system.
 * Unified type definitions for the action registry system.
 */

import { AppMode } from '../../types';
import type { CPBPath } from '../cognitivePrecisionBridge/types';
import { Schema } from "@google/genai";

// =============================================================================
// Core Action Types
// =============================================================================

/** Action categories for organizing and prioritizing actions */
export type ActionCategory =
    | 'ui'
    | 'generate'
    | 'execute'
    | 'analyze'
    | 'manage'
    | 'navigate'
    | 'search'
    | 'deploy';

/** Action complexity levels for CPB routing */
export type ActionComplexity = 'simple' | 'navigation' | 'analysis' | 'architecture' | 'critical';

/** Source system that registered the action */
export type ActionSource = 'component' | 'voice' | 'dom' | 'sovereign' | 'cpb';

/** Generic handler arguments */
export type ActionArgs = Record<string, unknown>;

/** Generic handler function signature */
export type ActionHandler = (args: ActionArgs) => Promise<ActionResult>;

/** Result returned by action handlers */
export interface ActionResult {
    success?: boolean;
    error?: string;
    [key: string]: unknown;
}

// =============================================================================
// Action Definition Interfaces
// =============================================================================

/**
 * Base action interface with common fields.
 * All action types extend from this.
 */
export interface BaseAction {
    /** Unique action identifier */
    id: string;
    /** Human-readable description */
    description: string;
    /** Handler function to execute the action */
    handler: ActionHandler;
    /** Priority for ordering (0-100, higher = more prominent) */
    priority?: number;
}

/**
 * Component-level action definition.
 * Used for UI component interactions.
 */
export interface ComponentAction extends BaseAction {
    /** Component this action belongs to */
    component: string;
    /** Action category for priority calculation */
    category: ActionCategory;
}

/**
 * Voice-triggered action definition.
 * Includes natural language examples for intent matching.
 */
export interface VoiceAction extends BaseAction {
    /** Action category */
    category: ActionCategory;
    /** Optional sector constraint */
    sector?: AppMode;
    /** Example phrases that trigger this action */
    examples: string[];
}

/**
 * Unified action definition with full metadata.
 * The most complete action type, used by the unified registry.
 */
export interface UnifiedAction extends BaseAction {
    /** Sectors where this action is relevant (empty = global) */
    sectors: string[];
    /** Guaranteed priority (not optional in unified actions) */
    priority: number;
    /** Execution path for CPB routing */
    executionPath: CPBPath | 'auto';
    /** Complexity level for routing decisions */
    complexity: ActionComplexity;
    /** Source system that registered this action */
    source: ActionSource;
    /** Example phrases for voice matching */
    examples?: string[];
    /** Whether action requires additional context */
    requiresContext?: boolean;
    /** JSON Schema for Gemini Tool definition */
    schema?: Schema;
    /** Category for organization */
    category?: ActionCategory;
}

// =============================================================================
// Execution & Result Types
// =============================================================================

/**
 * Result from executing an action through the unified registry.
 */
export interface ExecutionResult {
    success: boolean;
    actionId: string;
    output: unknown;
    executionPath: CPBPath;
    dqScore?: number;
    executionTimeMs?: number;
}

/**
 * Action registration parameters for SystemMind.
 */
export interface ActionRegistration {
    id: string;
    description: string;
    callback: ActionHandler;
    sectors?: string[];
    priority?: number;
}

// =============================================================================
// Registry State Types
// =============================================================================

/**
 * Internal state of the unified registry.
 */
export interface RegistryState {
    actions: Map<string, UnifiedAction>;
    initialized: boolean;
    lastUpdate: number;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isComponentAction(action: BaseAction): action is ComponentAction {
    return 'component' in action && 'category' in action;
}

export function isVoiceAction(action: BaseAction): action is VoiceAction {
    return 'examples' in action && Array.isArray((action as VoiceAction).examples);
}

export function isUnifiedAction(action: BaseAction): action is UnifiedAction {
    return 'sectors' in action && 'executionPath' in action && 'complexity' in action;
}
