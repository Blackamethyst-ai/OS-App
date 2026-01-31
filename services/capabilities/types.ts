/**
 * Unified Capability Types
 *
 * This module defines the unified capability system that consolidates:
 * - TAB_REGISTRY (43 tabs)
 * - Unified Action Registry (67 actions)
 * - Dynamic Tool Registry
 * - Voice Actions
 * - Component Actions
 */

import type { FunctionDeclaration } from '@google/genai';

// ============================================================================
// Core Enums
// ============================================================================

export type CapabilityKind = 'action' | 'navigation' | 'tool' | 'tab';

export type CapabilityComplexity =
  | 'simple'
  | 'navigation'
  | 'analysis'
  | 'architecture'
  | 'critical';

export type CapabilitySource =
  | 'core'
  | 'sovereign'
  | 'dynamic'
  | 'component'
  | 'voice'
  | 'tab';

export type CPBPath = 'direct' | 'ace' | 'hybrid' | 'cascade' | 'rlm' | 'auto';

export type ActionCategory =
  | 'ui'
  | 'generate'
  | 'execute'
  | 'analyze'
  | 'manage'
  | 'navigate'
  | 'search'
  | 'deploy';

// App modes/sectors
export type AppMode =
  | 'DASHBOARD'
  | 'METAVENTIONS_HUB'
  | 'NEXUS'
  | 'BIBLIOMORPHIC'
  | 'CODE_STUDIO'
  | 'IMAGE_GEN'
  | 'HARDWARE_ENGINEER'
  | 'MEMORY_CORE'
  | 'AGENT_CONTROL'
  | 'AUTONOMOUS_FINANCE'
  | 'CPB_TEST'
  | 'ARCHON'
  | 'SYNTHESIS_BRIDGE'
  | 'PROCESS_MAP'
  | 'VOICE_MODE';

// ============================================================================
// Core Capability Interface
// ============================================================================

export interface CapabilitySchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, CapabilitySchema>;
  required?: string[];
  description?: string;
  items?: CapabilitySchema;
  enum?: string[];
}

export interface CapabilityResult {
  success: boolean;
  error?: string;
  data?: unknown;
  message?: string;
  [key: string]: unknown;
}

export type CapabilityHandler = (
  args: Record<string, unknown>
) => Promise<CapabilityResult> | CapabilityResult;

export interface Capability {
  /** Unique identifier */
  id: string;

  /** Type of capability */
  kind: CapabilityKind;

  /** Human-readable description */
  description: string;

  /** Origin of this capability */
  source: CapabilitySource;

  /** Complexity level for routing */
  complexity: CapabilityComplexity;

  /** Priority for conflict resolution (0-100) */
  priority: number;

  /** Sectors where this capability is available (empty = global) */
  sectors: AppMode[];

  /** Handler function */
  handler: CapabilityHandler;

  /** CPB execution path */
  executionPath: CPBPath;

  /** Category for grouping */
  category?: ActionCategory;

  /** Alternative trigger phrases */
  aliases?: string[];

  /** Example usage phrases */
  examples?: string[];

  /** JSON schema for Gemini function calling */
  schema?: CapabilitySchema;

  /** For tab capabilities - the tab key */
  tabKey?: string;

  /** For navigation capabilities - the route */
  route?: string;

  /** Whether this capability requires additional context */
  requiresContext?: boolean;

  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tab-Specific Types
// ============================================================================

export interface SubtabDefinition {
  id: string;
  key: string;
  label: string;
  aliases?: string[];
}

export interface TabCapability extends Capability {
  kind: 'tab';
  tabKey: string;
  tabLabel: string;
  sectorMode: AppMode;
  subtabs?: SubtabDefinition[];
}

// ============================================================================
// Search & Match Types
// ============================================================================

export interface CapabilityMatch {
  capability: Capability;
  score: number;
  matchedOn: 'id' | 'alias' | 'description' | 'example';
}

export interface CapabilitySearchOptions {
  kind?: CapabilityKind;
  sector?: AppMode;
  source?: CapabilitySource;
  complexity?: CapabilityComplexity;
  limit?: number;
  includeGlobal?: boolean;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface RegistryStats {
  total: number;
  byKind: Record<CapabilityKind, number>;
  bySource: Record<CapabilitySource, number>;
  byComplexity: Record<CapabilityComplexity, number>;
  bySector: Record<string, number>;
}

export interface RegistryState {
  capabilities: Map<string, Capability>;
  initialized: boolean;
  lastUpdate: number;
}

// ============================================================================
// Gemini Integration
// ============================================================================

export interface GeminiManifest {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTabCapability(cap: Capability): cap is TabCapability {
  return cap.kind === 'tab' && 'tabKey' in cap;
}

export function isActionCapability(cap: Capability): boolean {
  return cap.kind === 'action';
}

export function isNavigationCapability(cap: Capability): boolean {
  return cap.kind === 'navigation' || cap.kind === 'tab';
}

// ============================================================================
// Complexity to CPB Path Mapping
// ============================================================================

export function complexityToCPBPath(complexity: CapabilityComplexity): CPBPath {
  switch (complexity) {
    case 'simple':
    case 'navigation':
      return 'direct';
    case 'analysis':
      return 'ace';
    case 'architecture':
      return 'hybrid';
    case 'critical':
      return 'cascade';
    default:
      return 'auto';
  }
}

// ============================================================================
// Adapter Interfaces
// ============================================================================

export interface VoiceContext {
  sector: AppMode;
  capabilities: Array<{
    id: string;
    description: string;
    examples: string[];
    complexity: CapabilityComplexity;
  }>;
  groupedByComplexity: Record<CapabilityComplexity, string[]>;
}

export interface GeminiToolManifest {
  functionDeclarations: FunctionDeclaration[];
}
