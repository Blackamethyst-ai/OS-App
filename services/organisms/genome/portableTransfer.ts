/**
 * US-005: Portable Skill Transfer (PaST)
 *
 * Implements skill export/import between agents using orthogonal decomposition.
 * Based on PaST research (arXiv:2601.11258) that separates skills into:
 * - Knowledge dimension: What the skill knows
 * - Skill dimension: How the skill acts
 * - Context dimension: When to apply the skill
 *
 * This separation enables portable transfer while adapting context-dependent
 * parts to the target agent's local environment.
 */

import type {
  SkillGenome,
  OrthogonalSkillVector,
  PortableSkillPackage,
  CompatibilityReport,
  PortabilitySpec,
  SkillRef,
  OrthogonalDimension,
} from './types';
import { skillGenomeCodec } from './codec';
import type { SubsystemType } from '../../archon/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default embedding dimension for orthogonal vectors */
const DEFAULT_DIMENSION = 256;

/** Minimum compatibility score for import */
const MIN_COMPATIBILITY_SCORE = 0.5;

/** Weight factors for compatibility scoring */
const COMPATIBILITY_WEIGHTS = {
  subsystem: 0.4,
  dependencies: 0.3,
  context: 0.3,
};

// =============================================================================
// PORTABLE SKILL TRANSFER CLASS
// =============================================================================

/**
 * PortableSkillTransfer (PaST) enables skill export/import between agents.
 *
 * Key capabilities:
 * - Orthogonal decomposition: Separate knowledge/skill/context dimensions
 * - Portable export: Strip context dependencies for transfer
 * - Adaptive import: Adapt to target agent's local context
 * - Compatibility verification: Ensure subsystem compatibility
 */
export class PortableSkillTransfer {
  private static instance: PortableSkillTransfer;

  private constructor() {}

  static getInstance(): PortableSkillTransfer {
    if (!PortableSkillTransfer.instance) {
      PortableSkillTransfer.instance = new PortableSkillTransfer();
    }
    return PortableSkillTransfer.instance;
  }

  // ---------------------------------------------------------------------------
  // ORTHOGONAL DECOMPOSITION
  // ---------------------------------------------------------------------------

  /**
   * Decompose a skill into orthogonal knowledge/skill/context dimensions.
   *
   * This separation follows PaST research (arXiv:2601.11258):
   * - Knowledge: Declarative information the skill contains
   * - Skill: Procedural capabilities (how to act)
   * - Context: Situational triggers (when to apply)
   *
   * @param skill - The SkillGenome to decompose
   * @returns OrthogonalSkillVector with separated dimensions
   */
  decomposeToOrthogonal(skill: SkillGenome): OrthogonalSkillVector {
    // Extract existing orthogonal dimensions if available
    const existingDimensions = skill.portability?.orthogonalDimensions || [];

    // Knowledge dimension: What the skill knows
    // Derived from description, tags, and input/output schemas
    const knowledgeVector = this.extractKnowledgeDimension(
      skill,
      existingDimensions.filter((d) => d.type === 'knowledge')
    );

    // Skill dimension: How the skill acts
    // Derived from handler, dependencies, and runtime characteristics
    const skillVector = this.extractSkillDimension(
      skill,
      existingDimensions.filter((d) => d.type === 'skill')
    );

    // Context dimension: When to apply the skill
    // Derived from context requirements and compatibility
    const contextVector = this.extractContextDimension(
      skill,
      existingDimensions.filter((d) => d.type === 'context')
    );

    return {
      knowledge: knowledgeVector,
      skill: skillVector,
      context: contextVector,
      dimensions: DEFAULT_DIMENSION,
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  /**
   * Export a skill as a portable package for transfer.
   *
   * This strips context-dependent parts while preserving:
   * - Core functionality (handler, schemas)
   * - Knowledge embeddings
   * - Skill embeddings
   *
   * Context is marked for adaptation rather than transferred directly.
   *
   * @param skill - The SkillGenome to export
   * @param targetAgent - Optional target agent for targeted export
   * @returns PortableSkillPackage ready for transfer
   */
  exportPortable(skill: SkillGenome, targetAgent?: string): PortableSkillPackage {
    // Validate skill is portable
    if (!skill.portability?.isPortable) {
      throw new Error(`Skill ${skill.id} is not marked as portable`);
    }

    // Decompose into orthogonal vectors
    const orthogonalVector = this.decomposeToOrthogonal(skill);

    // Create portable copy with stripped context
    const portableSkill = this.createPortableCopy(skill);

    // Sign and package
    const signature = this.generateTransferSignature(portableSkill, targetAgent);

    return {
      skill: portableSkill,
      orthogonalVector,
      transfer: {
        exportedAt: Date.now(),
        exportedBy: skill.origin.createdBy || 'unknown',
        targetAgent,
        signature,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // IMPORT
  // ---------------------------------------------------------------------------

  /**
   * Import a portable skill package and adapt to local context.
   *
   * This process:
   * 1. Validates package integrity
   * 2. Checks compatibility with target subsystems
   * 3. Adapts context dimension to local environment
   * 4. Creates a new SkillGenome with updated origin
   *
   * @param pkg - The PortableSkillPackage to import
   * @param agent - The importing agent's identifier
   * @returns Adapted SkillGenome for local use
   */
  importPortable(pkg: PortableSkillPackage, agent: string): SkillGenome {
    // Verify package integrity
    this.verifyPackageIntegrity(pkg);

    // Extract skill from package
    const importedSkill = pkg.skill;

    // Get target subsystems from skill's compatibility list
    const targetSubsystems = importedSkill.portability?.compatibility || [];

    // Verify compatibility
    const compatReport = this.verifyCompatibility(importedSkill, targetSubsystems);
    if (!compatReport.isCompatible) {
      throw new Error(
        `Skill ${importedSkill.id} is incompatible: score ${compatReport.score.toFixed(2)}, ` +
        `adaptations needed: ${compatReport.adaptationsNeeded.join(', ')}`
      );
    }

    // Adapt context dimension to local environment
    const adaptedSkill = this.adaptToLocalContext(
      importedSkill,
      pkg.orthogonalVector,
      agent,
      compatReport
    );

    // Update origin to mark as imported
    adaptedSkill.origin = {
      type: 'imported',
      sourceAgent: pkg.transfer.exportedBy,
      createdAt: Date.now(),
      createdBy: agent,
    };

    // Update timestamps
    adaptedSkill.updatedAt = Date.now();

    // Recompute checksum after adaptation
    adaptedSkill.checksum = skillGenomeCodec.computeChecksum(adaptedSkill);

    return adaptedSkill;
  }

  // ---------------------------------------------------------------------------
  // COMPATIBILITY VERIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Verify compatibility of a skill with target subsystems.
   *
   * Checks:
   * - Subsystem compatibility: Do target subsystems support the skill?
   * - Dependency availability: Are required dependencies present?
   * - Context requirements: Can context requirements be satisfied?
   *
   * @param skill - The SkillGenome to verify
   * @param targetSubsystems - Subsystems to check compatibility against
   * @returns CompatibilityReport with detailed analysis
   */
  verifyCompatibility(
    skill: SkillGenome,
    targetSubsystems: SubsystemType[]
  ): CompatibilityReport {
    // Initialize compatibility map
    const subsystemCompatibility: Record<SubsystemType, boolean> = {} as Record<
      SubsystemType,
      boolean
    >;

    // Check each subsystem
    const skillCompatibility = skill.portability?.compatibility || [];
    let compatibleCount = 0;

    for (const subsystem of targetSubsystems) {
      const isCompatible = skillCompatibility.includes(subsystem);
      subsystemCompatibility[subsystem] = isCompatible;
      if (isCompatible) compatibleCount++;
    }

    // Calculate subsystem score
    const subsystemScore =
      targetSubsystems.length > 0 ? compatibleCount / targetSubsystems.length : 1;

    // Check dependencies
    const missingDependencies = this.findMissingDependencies(skill.dependencies);
    const dependencyScore =
      skill.dependencies.length > 0
        ? 1 - missingDependencies.length / skill.dependencies.length
        : 1;

    // Check context requirements
    const contextRequirements = skill.portability?.requiresContext || [];
    const satisfiedContext = this.checkContextSatisfaction(contextRequirements);
    const contextScore =
      contextRequirements.length > 0
        ? satisfiedContext.length / contextRequirements.length
        : 1;

    // Calculate overall score
    const score =
      COMPATIBILITY_WEIGHTS.subsystem * subsystemScore +
      COMPATIBILITY_WEIGHTS.dependencies * dependencyScore +
      COMPATIBILITY_WEIGHTS.context * contextScore;

    // Determine adaptations needed
    const adaptationsNeeded: string[] = [];

    if (subsystemScore < 1) {
      const incompatibleSubsystems = targetSubsystems.filter(
        (s) => !subsystemCompatibility[s]
      );
      adaptationsNeeded.push(
        `Subsystem adaptation for: ${incompatibleSubsystems.join(', ')}`
      );
    }

    if (missingDependencies.length > 0) {
      adaptationsNeeded.push(
        `Missing dependencies: ${missingDependencies.map((d) => d.skillId).join(', ')}`
      );
    }

    const unsatisfiedContext = contextRequirements.filter(
      (c) => !satisfiedContext.includes(c)
    );
    if (unsatisfiedContext.length > 0) {
      adaptationsNeeded.push(
        `Context adaptation for: ${unsatisfiedContext.join(', ')}`
      );
    }

    return {
      score,
      isCompatible: score >= MIN_COMPATIBILITY_SCORE,
      subsystemCompatibility,
      missingDependencies,
      contextRequirements,
      adaptationsNeeded,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: DIMENSION EXTRACTION
  // ---------------------------------------------------------------------------

  /**
   * Extract knowledge dimension from skill.
   *
   * Knowledge includes:
   * - Semantic meaning from name and description
   * - Domain tags
   * - Schema structure information
   */
  private extractKnowledgeDimension(
    skill: SkillGenome,
    existing: OrthogonalDimension[]
  ): number[] {
    // Use existing embeddings if available
    const existingEmbedding = existing
      .flatMap((d) => d.embedding || [])
      .slice(0, DEFAULT_DIMENSION);

    if (existingEmbedding.length === DEFAULT_DIMENSION) {
      return existingEmbedding;
    }

    // Generate knowledge vector from skill metadata
    const vector = new Array(DEFAULT_DIMENSION).fill(0);

    // Hash name and description into vector positions
    const text = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`;
    this.embedText(text, vector, 0, 128);

    // Embed schema structure
    const schemaText = JSON.stringify({
      input: skill.inputSchema,
      output: skill.outputSchema,
    });
    this.embedText(schemaText, vector, 128, 128);

    // Normalize
    return this.normalizeVector(vector);
  }

  /**
   * Extract skill dimension from handler and runtime.
   *
   * Skill includes:
   * - Handler characteristics
   * - Runtime type (sync/async)
   * - Timeout and complexity indicators
   * - Dependency structure
   */
  private extractSkillDimension(
    skill: SkillGenome,
    existing: OrthogonalDimension[]
  ): number[] {
    // Use existing embeddings if available
    const existingEmbedding = existing
      .flatMap((d) => d.embedding || [])
      .slice(0, DEFAULT_DIMENSION);

    if (existingEmbedding.length === DEFAULT_DIMENSION) {
      return existingEmbedding;
    }

    const vector = new Array(DEFAULT_DIMENSION).fill(0);

    // Embed handler body
    this.embedText(skill.handler.body, vector, 0, 192);

    // Encode runtime characteristics
    vector[192] = skill.runtime === 'async' ? 1 : 0;
    vector[193] = Math.min(skill.timeoutMs / 60000, 1); // Normalize timeout to 0-1
    vector[194] = skill.handler.isAsync ? 1 : 0;
    vector[195] = skill.handler.params.length / 10; // Normalize params count

    // Encode dependency count
    vector[196] = Math.min(skill.dependencies.length / 10, 1);

    // Encode DQ score
    vector[197] = skill.dqScore;

    // Encode complexity from handler length
    vector[198] = Math.min(skill.handler.body.length / 10000, 1);

    // Normalize
    return this.normalizeVector(vector);
  }

  /**
   * Extract context dimension from compatibility and requirements.
   *
   * Context includes:
   * - Subsystem compatibility
   * - Required context keys
   * - Origin and synthesis patterns
   */
  private extractContextDimension(
    skill: SkillGenome,
    existing: OrthogonalDimension[]
  ): number[] {
    // Use existing embeddings if available
    const existingEmbedding = existing
      .flatMap((d) => d.embedding || [])
      .slice(0, DEFAULT_DIMENSION);

    if (existingEmbedding.length === DEFAULT_DIMENSION) {
      return existingEmbedding;
    }

    const vector = new Array(DEFAULT_DIMENSION).fill(0);

    // Encode subsystem compatibility as bits
    const subsystemTypes: SubsystemType[] = [
      'ace',
      'dq',
      'dream',
      'evolution',
      'kernel',
      'voice',
      'cpb',
      'genome',
      'swarm',
      'cognitive',
    ];

    const compatibility = skill.portability?.compatibility || [];
    for (let i = 0; i < subsystemTypes.length; i++) {
      vector[i] = compatibility.includes(subsystemTypes[i]) ? 1 : 0;
    }

    // Embed context requirements
    const contextReqs = (skill.portability?.requiresContext || []).join(' ');
    this.embedText(contextReqs, vector, 16, 120);

    // Encode origin type
    const originTypes = ['native', 'synthesized', 'imported'];
    const originIndex = originTypes.indexOf(skill.origin.type);
    vector[136] = originIndex >= 0 ? originIndex / 2 : 0;

    // Encode parent skill count for synthesized skills
    vector[137] = (skill.origin.parentSkills?.length || 0) / 10;

    // Encode synthesis pattern if present
    const patterns = ['sequential', 'parallel', 'conditional', 'feedback_loop'];
    const patternIndex = skill.origin.synthesisPattern
      ? patterns.indexOf(skill.origin.synthesisPattern)
      : -1;
    vector[138] = patternIndex >= 0 ? patternIndex / 3 : 0;

    // Encode portability flag
    vector[139] = skill.portability?.isPortable ? 1 : 0;

    // Normalize
    return this.normalizeVector(vector);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Create a portable copy with stripped context dependencies.
   */
  private createPortableCopy(skill: SkillGenome): SkillGenome {
    // Deep clone
    const copy: SkillGenome = JSON.parse(JSON.stringify(skill));

    // Mark context requirements as needing adaptation
    if (copy.portability) {
      // Keep context requirements listed but flag them as external
      copy.portability.orthogonalDimensions = copy.portability.orthogonalDimensions.map(
        (dim) => {
          if (dim.type === 'context') {
            return {
              ...dim,
              name: `[REQUIRES_ADAPTATION] ${dim.name}`,
            };
          }
          return dim;
        }
      );
    }

    return copy;
  }

  /**
   * Adapt imported skill to local context.
   */
  private adaptToLocalContext(
    skill: SkillGenome,
    orthogonalVector: OrthogonalSkillVector,
    agent: string,
    compatReport: CompatibilityReport
  ): SkillGenome {
    // Deep clone
    const adapted: SkillGenome = JSON.parse(JSON.stringify(skill));

    // Update MCP resource URI for new agent
    if (adapted.mcpResource) {
      adapted.mcpResource.uri = `mcp://agent-genome/skills/${adapted.id}`;
    }

    // Rebuild orthogonal dimensions with adapted context
    const adaptedContextDimension: OrthogonalDimension = {
      type: 'context',
      name: `context:${agent}`,
      weight: 0.33,
      embedding: orthogonalVector.context,
    };

    // Replace context dimensions with adapted version
    if (adapted.portability) {
      const nonContextDims = adapted.portability.orthogonalDimensions.filter(
        (d) => d.type !== 'context'
      );
      adapted.portability.orthogonalDimensions = [
        ...nonContextDims,
        adaptedContextDimension,
      ];

      // Update context requirements based on compatibility
      adapted.portability.requiresContext = compatReport.contextRequirements.filter(
        (req) => !compatReport.adaptationsNeeded.some((a) => a.includes(req))
      );
    }

    // Update name to indicate adaptation
    adapted.name = `${skill.name} (adapted)`;

    return adapted;
  }

  /**
   * Verify package integrity before import.
   */
  private verifyPackageIntegrity(pkg: PortableSkillPackage): void {
    // Verify skill checksum
    if (!skillGenomeCodec.validateChecksum(pkg.skill)) {
      throw new Error('Package skill checksum validation failed');
    }

    // Verify signature
    const expectedSignature = this.generateTransferSignature(
      pkg.skill,
      pkg.transfer.targetAgent
    );
    if (pkg.transfer.signature !== expectedSignature) {
      throw new Error('Package signature validation failed');
    }

    // Validate orthogonal vector dimensions
    if (
      pkg.orthogonalVector.knowledge.length !== pkg.orthogonalVector.dimensions ||
      pkg.orthogonalVector.skill.length !== pkg.orthogonalVector.dimensions ||
      pkg.orthogonalVector.context.length !== pkg.orthogonalVector.dimensions
    ) {
      throw new Error('Orthogonal vector dimension mismatch');
    }
  }

  /**
   * Generate transfer signature for package validation.
   */
  private generateTransferSignature(skill: SkillGenome, targetAgent?: string): string {
    const content = `${skill.id}:${skill.checksum}:${targetAgent || 'any'}`;
    return this.simpleHash(content);
  }

  /**
   * Find missing dependencies from required list.
   */
  private findMissingDependencies(dependencies: SkillRef[]): SkillRef[] {
    // In a real implementation, this would check against a skill registry
    // For now, we assume optional dependencies can be missing
    return dependencies.filter((dep) => !dep.optional);
  }

  /**
   * Check which context requirements can be satisfied.
   */
  private checkContextSatisfaction(requirements: string[]): string[] {
    // In a real implementation, this would check against available context providers
    // For now, we assume common context types are available
    const availableContextTypes = [
      'user',
      'session',
      'environment',
      'time',
      'preferences',
    ];
    return requirements.filter((req) =>
      availableContextTypes.some((ctx) => req.toLowerCase().includes(ctx))
    );
  }

  /**
   * Embed text into vector using simple hash-based distribution.
   */
  private embedText(
    text: string,
    vector: number[],
    startIndex: number,
    length: number
  ): void {
    if (!text) return;

    // Use character codes to distribute into vector
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const index = startIndex + (code % length);
      vector[index] = (vector[index] + code / 255) / 2;
    }
  }

  /**
   * Normalize vector to unit length.
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }

  /**
   * Simple hash function for signatures.
   */
  private simpleHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `past:${hex}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const portableSkillTransfer = PortableSkillTransfer.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Decompose a skill into orthogonal dimensions.
 */
export function decomposeSkill(skill: SkillGenome): OrthogonalSkillVector {
  return portableSkillTransfer.decomposeToOrthogonal(skill);
}

/**
 * Export a skill as a portable package.
 */
export function exportSkill(
  skill: SkillGenome,
  targetAgent?: string
): PortableSkillPackage {
  return portableSkillTransfer.exportPortable(skill, targetAgent);
}

/**
 * Import a portable skill package.
 */
export function importSkill(pkg: PortableSkillPackage, agent: string): SkillGenome {
  return portableSkillTransfer.importPortable(pkg, agent);
}

/**
 * Verify skill compatibility with subsystems.
 */
export function verifySkillCompatibility(
  skill: SkillGenome,
  targetSubsystems: SubsystemType[]
): CompatibilityReport {
  return portableSkillTransfer.verifyCompatibility(skill, targetSubsystems);
}

/**
 * Calculate similarity between two orthogonal vectors.
 */
export function calculateSkillSimilarity(
  a: OrthogonalSkillVector,
  b: OrthogonalSkillVector
): { knowledge: number; skill: number; context: number; overall: number } {
  const cosineSimilarity = (v1: number[], v2: number[]): number => {
    if (v1.length !== v2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  };

  const knowledgeSim = cosineSimilarity(a.knowledge, b.knowledge);
  const skillSim = cosineSimilarity(a.skill, b.skill);
  const contextSim = cosineSimilarity(a.context, b.context);

  // Weighted average: knowledge and skill matter more than context for transfer
  const overall = knowledgeSim * 0.35 + skillSim * 0.45 + contextSim * 0.2;

  return {
    knowledge: knowledgeSim,
    skill: skillSim,
    context: contextSim,
    overall,
  };
}
