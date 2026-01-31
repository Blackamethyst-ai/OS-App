/**
 * Agent Genome Types
 *
 * Defines the SkillGenome interface for portable, inheritable agent capabilities.
 * Skills can be serialized, exposed via MCP, composed via SkillWeaver, and
 * transferred between agents via PaST (Parametric Skill Transfer).
 *
 * Research basis:
 * - arXiv:2504.07079 (SkillWeaver) - 31.8% improvement via skill synthesis
 * - arXiv:2512.23880 (CASCADE) - 93.3% success in autonomous skill creation
 * - arXiv:2601.11258 (PaST) - Orthogonal knowledge/skill decomposition
 * - MCP Specification (2025-11-25) - Protocol standard
 */

import type { SubsystemType, DQScore } from '../../archon/types';

// =============================================================================
// CORE SKILL GENOME
// =============================================================================

/**
 * SkillGenome represents a portable, serializable agent capability.
 *
 * Like biological DNA, a SkillGenome can be:
 * - Inherited: Transferred from one agent to another
 * - Expressed: Executed as a tool via MCP
 * - Mutated: Composed with other skills via SkillWeaver
 * - Replicated: Serialized and stored for future use
 */
export interface SkillGenome {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Human-readable name */
  name: string;

  /** Purpose and usage description */
  description: string;

  /** Categorization tags */
  tags: string[];

  // ---------------------------------------------------------------------------
  // Schema Definitions
  // ---------------------------------------------------------------------------

  /** JSON Schema for expected input */
  inputSchema: JSONSchema;

  /** JSON Schema for guaranteed output */
  outputSchema: JSONSchema;

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  /** Serialized function body (stringified) */
  handler: SerializedFunction;

  /** Required sub-skills (dependency graph) */
  dependencies: SkillRef[];

  /** Execution model */
  runtime: 'sync' | 'async';

  /** Maximum execution time in ms */
  timeoutMs: number;

  // ---------------------------------------------------------------------------
  // MCP Protocol Integration
  // ---------------------------------------------------------------------------

  /** MCP resource metadata for discovery and invocation */
  mcpResource: MCPSkillResource;

  // ---------------------------------------------------------------------------
  // Portability (PaST)
  // ---------------------------------------------------------------------------

  /** Transfer and compatibility metadata */
  portability: PortabilitySpec;

  // ---------------------------------------------------------------------------
  // Lineage & Origin
  // ---------------------------------------------------------------------------

  /** How this skill was created */
  origin: SkillOrigin;

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /** SHA-256 checksum of handler + schemas for integrity */
  checksum: string;

  /** Quality score from synthesis or validation */
  dqScore: number;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  updatedAt: number;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/** JSON Schema subset for input/output validation */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/** Serialized function representation */
export interface SerializedFunction {
  /** Function body as string (for serialization) */
  body: string;

  /** Parameter names */
  params: string[];

  /** Whether function is async */
  isAsync: boolean;

  /** Original source location (for debugging) */
  sourceLocation?: string;
}

/** Reference to another skill (for dependencies) */
export interface SkillRef {
  /** Skill ID */
  skillId: string;

  /** Required version (semver range, e.g., "^1.0.0") */
  versionRange: string;

  /** Whether this dependency is optional */
  optional: boolean;
}

/** MCP resource metadata for skill discovery */
export interface MCPSkillResource {
  /** Resource URI: mcp://agent-genome/skills/{id} */
  uri: string;

  /** MIME type (always application/json for skills) */
  mimeType: 'application/json';

  /** MCP tool schema for invocation */
  toolSchema: MCPToolSchema;
}

/** MCP tool schema for skill invocation */
export interface MCPToolSchema {
  /** Tool name (prefixed with genome_) */
  name: string;

  /** Tool description */
  description: string;

  /** Input parameters schema */
  inputSchema: JSONSchema;
}

/** Portability specification for skill transfer */
export interface PortabilitySpec {
  /** Can this skill be transferred to other agents? */
  isPortable: boolean;

  /** Context keys required for execution */
  requiresContext: string[];

  /** Compatible subsystems */
  compatibility: SubsystemType[];

  /** Orthogonal dimensions for PaST decomposition */
  orthogonalDimensions: OrthogonalDimension[];
}

/** Orthogonal dimension for PaST decomposition */
export interface OrthogonalDimension {
  /** Dimension type */
  type: 'knowledge' | 'skill' | 'context';

  /** Dimension name */
  name: string;

  /** Dimension weight (0-1) */
  weight: number;

  /** Embedding vector (for similarity) */
  embedding?: number[];
}

/** Skill origin tracking */
export interface SkillOrigin {
  /** How the skill was created */
  type: 'native' | 'synthesized' | 'imported';

  /** Parent skills (for synthesized skills) */
  parentSkills?: string[];

  /** Source agent (for imported skills) */
  sourceAgent?: string;

  /** Synthesis pattern used */
  synthesisPattern?: SynthesisPattern;

  /** Creation timestamp */
  createdAt: number;

  /** Creator identifier */
  createdBy?: string;
}

// =============================================================================
// SYNTHESIS PATTERNS (SkillWeaver)
// =============================================================================

/** Patterns for composing skills */
export type SynthesisPattern =
  | 'sequential'      // A → B → C
  | 'parallel'        // A + B → merge
  | 'conditional'     // if(cond) A else B
  | 'feedback_loop';  // A → B → critic → A (if DQ < threshold)

/** Skill synthesis request */
export interface SynthesisRequest {
  /** Base skills to compose */
  baseSkills: string[];

  /** Composition pattern */
  pattern: SynthesisPattern;

  /** Goal description for the synthesized skill */
  goal: string;

  /** Optional constraints */
  constraints?: SynthesisConstraints;
}

/** Constraints for skill synthesis */
export interface SynthesisConstraints {
  /** Maximum execution time */
  maxTimeoutMs?: number;

  /** Required DQ score */
  minDQScore?: number;

  /** Required output schema */
  outputSchema?: JSONSchema;

  /** Forbidden dependencies */
  excludeSkills?: string[];
}

/** Result of skill synthesis */
export interface SynthesizedSkill {
  /** The synthesized skill genome */
  skill: SkillGenome;

  /** Execution plan */
  executionPlan: ExecutionPlan;

  /** DQ validation result */
  validation: DQScore;

  /** Synthesis metadata */
  metadata: {
    patternsUsed: SynthesisPattern;
    baseSkillCount: number;
    synthesisTimeMs: number;
    iterationsRequired: number;
  };
}

/** Execution plan for composed skills */
export interface ExecutionPlan {
  /** Ordered steps */
  steps: ExecutionStep[];

  /** Dependency graph */
  dependencyGraph: Map<string, string[]>;

  /** Estimated total time */
  estimatedTimeMs: number;
}

/** Single step in execution plan */
export interface ExecutionStep {
  /** Step ID */
  id: string;

  /** Skill to execute */
  skillId: string;

  /** Input mapping from previous steps */
  inputMapping: Record<string, string>;

  /** Condition for execution (conditional pattern) */
  condition?: string;

  /** Dependencies (must complete before this step) */
  dependsOn: string[];
}

// =============================================================================
// PORTABLE TRANSFER (PaST)
// =============================================================================

/** Portable skill package for transfer */
export interface PortableSkillPackage {
  /** The skill genome */
  skill: SkillGenome;

  /** Orthogonal vector decomposition */
  orthogonalVector: OrthogonalSkillVector;

  /** Transfer metadata */
  transfer: {
    exportedAt: number;
    exportedBy: string;
    targetAgent?: string;
    signature: string;
  };
}

/** Orthogonal skill vector for PaST */
export interface OrthogonalSkillVector {
  /** Knowledge dimension (what it knows) */
  knowledge: number[];

  /** Skill dimension (how it acts) */
  skill: number[];

  /** Context dimension (when to apply) */
  context: number[];

  /** Total dimensionality */
  dimensions: number;
}

/** Compatibility report for skill import */
export interface CompatibilityReport {
  /** Overall compatibility score (0-1) */
  score: number;

  /** Compatible */
  isCompatible: boolean;

  /** Subsystem compatibility */
  subsystemCompatibility: Record<SubsystemType, boolean>;

  /** Missing dependencies */
  missingDependencies: SkillRef[];

  /** Context requirements */
  contextRequirements: string[];

  /** Adaptation required */
  adaptationsNeeded: string[];
}

// =============================================================================
// SKILL REGISTRY
// =============================================================================

/** Skill registration entry */
export interface SkillRegistration {
  /** The skill genome */
  skill: SkillGenome;

  /** Registration status */
  status: 'active' | 'deprecated' | 'disabled';

  /** Usage statistics */
  stats: SkillStats;

  /** Registered at */
  registeredAt: number;
}

/** Skill usage statistics */
export interface SkillStats {
  /** Total invocations */
  invocations: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average execution time */
  avgLatencyMs: number;

  /** Average DQ score */
  avgDQScore: number;

  /** Transfer count */
  transferCount: number;

  /** Last invoked timestamp */
  lastInvokedAt?: number;
}

// All types are exported inline via their interface/type declarations above
