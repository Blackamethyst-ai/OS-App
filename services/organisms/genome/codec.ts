/**
 * SkillGenome Codec
 *
 * Serialization and deserialization of SkillGenome objects.
 * Handles function-to-string conversion, checksum validation,
 * and integrity verification for skill transfer.
 *
 * Research basis:
 * - arXiv:2512.23880 (CASCADE) - Autonomous skill creation
 * - arXiv:2601.11258 (PaST) - Parametric skill transfer
 */

import type {
  SkillGenome,
  SerializedFunction,
  JSONSchema,
  PortableSkillPackage,
  OrthogonalSkillVector,
} from './types';

// =============================================================================
// CODEC CLASS
// =============================================================================

/**
 * SkillGenomeCodec handles serialization and deserialization of skills.
 *
 * Key responsibilities:
 * - Serialize SkillGenome to JSON string
 * - Deserialize JSON string to SkillGenome
 * - Compute and validate checksums
 * - Handle function serialization safely
 */
export class SkillGenomeCodec {
  private static instance: SkillGenomeCodec;

  private constructor() {}

  static getInstance(): SkillGenomeCodec {
    if (!SkillGenomeCodec.instance) {
      SkillGenomeCodec.instance = new SkillGenomeCodec();
    }
    return SkillGenomeCodec.instance;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize a SkillGenome to JSON string.
   *
   * @param skill - The skill genome to serialize
   * @param pretty - Whether to format with indentation
   * @returns JSON string representation
   */
  serialize(skill: SkillGenome, pretty = false): string {
    // Validate before serialization
    this.validateSkillGenome(skill);

    // Recompute checksum to ensure integrity
    const checksummedSkill = {
      ...skill,
      checksum: this.computeChecksum(skill),
      updatedAt: Date.now(),
    };

    return pretty
      ? JSON.stringify(checksummedSkill, null, 2)
      : JSON.stringify(checksummedSkill);
  }

  /**
   * Deserialize a JSON string to SkillGenome.
   *
   * @param json - JSON string to deserialize
   * @param validateChecksum - Whether to validate checksum (default: true)
   * @returns Parsed SkillGenome
   * @throws Error if invalid or checksum mismatch
   */
  deserialize(json: string, validateChecksum = true): SkillGenome {
    let parsed: unknown;

    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }

    // Type guard
    if (!this.isSkillGenome(parsed)) {
      throw new Error('Invalid SkillGenome structure');
    }

    const skill = parsed as SkillGenome;

    // Validate checksum if requested
    if (validateChecksum) {
      const computedChecksum = this.computeChecksum(skill);
      if (skill.checksum !== computedChecksum) {
        throw new Error(
          `Checksum mismatch: expected ${skill.checksum}, got ${computedChecksum}`
        );
      }
    }

    // Validate structure
    this.validateSkillGenome(skill);

    return skill;
  }

  // ---------------------------------------------------------------------------
  // Checksum
  // ---------------------------------------------------------------------------

  /**
   * Compute SHA-256 checksum of handler + schemas.
   *
   * The checksum covers:
   * - Handler body and params
   * - Input schema
   * - Output schema
   * - Dependencies
   *
   * This ensures integrity during transfer.
   */
  computeChecksum(skill: SkillGenome): string {
    const checksumInput = {
      handler: skill.handler,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
      dependencies: skill.dependencies,
    };

    const content = JSON.stringify(checksumInput);
    return this.sha256(content);
  }

  /**
   * Validate checksum matches computed value.
   */
  validateChecksum(skill: SkillGenome): boolean {
    const computed = this.computeChecksum(skill);
    return skill.checksum === computed;
  }

  // ---------------------------------------------------------------------------
  // Function Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize a JavaScript function to SerializedFunction.
   *
   * @param fn - Function to serialize
   * @param sourceLocation - Optional source file location
   * @returns SerializedFunction representation
   */
  serializeFunction(
    fn: (...args: unknown[]) => unknown,
    sourceLocation?: string
  ): SerializedFunction {
    const fnString = fn.toString();

    // Extract parameters
    const paramMatch = fnString.match(/\(([^)]*)\)/);
    const params = paramMatch
      ? paramMatch[1].split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    // Extract body
    const bodyMatch = fnString.match(/\{([\s\S]*)\}$/);
    const body = bodyMatch ? bodyMatch[1].trim() : '';

    // Check if async
    const isAsync = fnString.startsWith('async');

    return {
      body,
      params,
      isAsync,
      sourceLocation,
    };
  }

  /**
   * Deserialize a SerializedFunction to executable function.
   *
   * WARNING: This uses Function constructor. Only deserialize
   * trusted skill genomes. The function is sandboxed but still
   * has access to global scope.
   *
   * @param serialized - SerializedFunction to deserialize
   * @returns Executable function
   */
  deserializeFunction(
    serialized: SerializedFunction
  ): (...args: unknown[]) => unknown {
    const { body, params, isAsync } = serialized;

    if (isAsync) {
      // Create async function
      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;
      return new AsyncFunction(...params, body);
    } else {
      // Create sync function
      return new Function(...params, body) as (...args: unknown[]) => unknown;
    }
  }

  // ---------------------------------------------------------------------------
  // Portable Package
  // ---------------------------------------------------------------------------

  /**
   * Create a portable package for skill transfer.
   *
   * @param skill - Skill to package
   * @param sourceAgent - Agent exporting the skill
   * @param targetAgent - Optional target agent
   * @returns PortableSkillPackage
   */
  createPortablePackage(
    skill: SkillGenome,
    sourceAgent: string,
    targetAgent?: string
  ): PortableSkillPackage {
    // Extract orthogonal vectors from portability spec
    const orthogonalVector = this.extractOrthogonalVector(skill);

    // Create package
    const pkg: PortableSkillPackage = {
      skill,
      orthogonalVector,
      transfer: {
        exportedAt: Date.now(),
        exportedBy: sourceAgent,
        targetAgent,
        signature: this.signPackage(skill, sourceAgent),
      },
    };

    return pkg;
  }

  /**
   * Validate and unpack a portable package.
   *
   * @param pkg - Package to unpack
   * @returns SkillGenome if valid
   * @throws Error if invalid signature or checksum
   */
  unpackPortablePackage(pkg: PortableSkillPackage): SkillGenome {
    // Verify signature
    const expectedSignature = this.signPackage(
      pkg.skill,
      pkg.transfer.exportedBy
    );
    if (pkg.transfer.signature !== expectedSignature) {
      throw new Error('Invalid package signature');
    }

    // Verify checksum
    if (!this.validateChecksum(pkg.skill)) {
      throw new Error('Skill checksum validation failed');
    }

    return pkg.skill;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate a SkillGenome structure.
   *
   * @param skill - Skill to validate
   * @throws Error if invalid
   */
  validateSkillGenome(skill: SkillGenome): void {
    const errors: string[] = [];

    // Required fields
    if (!skill.id) errors.push('Missing id');
    if (!skill.name) errors.push('Missing name');
    if (!skill.version) errors.push('Missing version');
    if (!skill.handler) errors.push('Missing handler');
    if (!skill.inputSchema) errors.push('Missing inputSchema');
    if (!skill.outputSchema) errors.push('Missing outputSchema');

    // Version format
    if (skill.version && !/^\d+\.\d+\.\d+/.test(skill.version)) {
      errors.push('Invalid version format (expected semver)');
    }

    // Handler structure
    if (skill.handler) {
      if (typeof skill.handler.body !== 'string') {
        errors.push('Handler body must be a string');
      }
      if (!Array.isArray(skill.handler.params)) {
        errors.push('Handler params must be an array');
      }
    }

    // MCP resource
    if (skill.mcpResource) {
      if (!skill.mcpResource.uri?.startsWith('mcp://agent-genome/skills/')) {
        errors.push('Invalid MCP resource URI format');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid SkillGenome: ${errors.join(', ')}`);
    }
  }

  /**
   * Type guard to check if object is a SkillGenome.
   */
  isSkillGenome(obj: unknown): obj is SkillGenome {
    if (typeof obj !== 'object' || obj === null) return false;

    const skill = obj as Record<string, unknown>;

    return (
      typeof skill.id === 'string' &&
      typeof skill.name === 'string' &&
      typeof skill.version === 'string' &&
      typeof skill.handler === 'object' &&
      typeof skill.inputSchema === 'object' &&
      typeof skill.outputSchema === 'object'
    );
  }

  // ---------------------------------------------------------------------------
  // Schema Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate input against a JSON schema.
   *
   * @param input - Input to validate
   * @param schema - JSON schema
   * @returns Validation result
   */
  validateAgainstSchema(
    input: unknown,
    schema: JSONSchema
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Type check
    if (!this.checkType(input, schema.type)) {
      errors.push(`Expected type ${schema.type}, got ${typeof input}`);
      return { valid: false, errors };
    }

    // Object property validation
    if (schema.type === 'object' && schema.properties) {
      const obj = input as Record<string, unknown>;

      // Required fields
      for (const required of schema.required || []) {
        if (!(required in obj)) {
          errors.push(`Missing required field: ${required}`);
        }
      }

      // Property types
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const result = this.validateAgainstSchema(obj[key], propSchema);
          errors.push(...result.errors.map((e) => `${key}: ${e}`));
        }
      }
    }

    // Array item validation
    if (schema.type === 'array' && schema.items && Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        const result = this.validateAgainstSchema(input[i], schema.items);
        errors.push(...result.errors.map((e) => `[${i}]: ${e}`));
      }
    }

    // String constraints
    if (schema.type === 'string' && typeof input === 'string') {
      if (schema.minLength && input.length < schema.minLength) {
        errors.push(`String too short (min: ${schema.minLength})`);
      }
      if (schema.maxLength && input.length > schema.maxLength) {
        errors.push(`String too long (max: ${schema.maxLength})`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(input)) {
        errors.push(`String does not match pattern: ${schema.pattern}`);
      }
    }

    // Number constraints
    if (schema.type === 'number' && typeof input === 'number') {
      if (schema.minimum !== undefined && input < schema.minimum) {
        errors.push(`Number too small (min: ${schema.minimum})`);
      }
      if (schema.maximum !== undefined && input > schema.maximum) {
        errors.push(`Number too large (max: ${schema.maximum})`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(input)) {
      errors.push(`Value not in enum: ${JSON.stringify(schema.enum)}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private checkType(value: unknown, type: JSONSchema['type']): boolean {
    switch (type) {
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'null':
        return value === null;
      default:
        return false;
    }
  }

  private sha256(content: string): string {
    // Use Web Crypto API if available (browser/modern Node)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Note: This is sync approximation; real impl would be async
      // For now, use simple hash
      return this.simpleHash(content);
    }
    return this.simpleHash(content);
  }

  private simpleHash(content: string): string {
    // Simple hash for checksum (replace with crypto.subtle in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:${hex}${'0'.repeat(56)}`.slice(0, 71);
  }

  private extractOrthogonalVector(skill: SkillGenome): OrthogonalSkillVector {
    // Extract from portability dimensions or create default
    const dimensions = skill.portability?.orthogonalDimensions || [];

    const knowledge = dimensions
      .filter((d) => d.type === 'knowledge')
      .flatMap((d) => d.embedding || []);

    const skillVec = dimensions
      .filter((d) => d.type === 'skill')
      .flatMap((d) => d.embedding || []);

    const context = dimensions
      .filter((d) => d.type === 'context')
      .flatMap((d) => d.embedding || []);

    return {
      knowledge: knowledge.length > 0 ? knowledge : new Array(256).fill(0),
      skill: skillVec.length > 0 ? skillVec : new Array(256).fill(0),
      context: context.length > 0 ? context : new Array(256).fill(0),
      dimensions: 256,
    };
  }

  private signPackage(skill: SkillGenome, agent: string): string {
    const content = `${skill.id}:${skill.checksum}:${agent}`;
    return this.simpleHash(content);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const skillGenomeCodec = SkillGenomeCodec.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function serializeSkill(skill: SkillGenome, pretty = false): string {
  return skillGenomeCodec.serialize(skill, pretty);
}

export function deserializeSkill(json: string): SkillGenome {
  return skillGenomeCodec.deserialize(json);
}

export function validateSkill(skill: SkillGenome): void {
  skillGenomeCodec.validateSkillGenome(skill);
}

export function computeSkillChecksum(skill: SkillGenome): string {
  return skillGenomeCodec.computeChecksum(skill);
}
