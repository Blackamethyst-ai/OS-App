/**
 * MCPSkillServer (US-003)
 *
 * Exposes SkillGenome instances as MCP resources for discovery and invocation.
 * Implements the Model Context Protocol for skill sharing between agents.
 *
 * Key features:
 * - Skill registration and discovery via MCP resources
 * - Skill-to-tool schema conversion for MCP invocation
 * - In-memory registry with filtering and search
 * - Full skill genome retrieval for transfer
 *
 * Resource URI format: mcp://agent-genome/skills/{skillId}
 *
 * Research basis:
 * - arXiv:2504.07079 (SkillWeaver) - Skill synthesis and composition
 * - arXiv:2512.23880 (CASCADE) - Autonomous skill creation
 * - arXiv:2601.11258 (PaST) - Parametric skill transfer
 * - MCP Specification (2025-11-25) - Protocol standard
 */

import type {
  SkillGenome,
  MCPSkillResource,
  MCPToolSchema,
  SkillRegistration,
  SkillStats,
  JSONSchema,
} from './types';
import { skillGenomeCodec } from './codec';
import { logger } from '../../logger';

// =============================================================================
// MCP SERVER INTERFACES
// =============================================================================

/**
 * Filter options for listing skills.
 */
export interface SkillFilter {
  /** Filter by tags (any match) */
  tags?: string[];

  /** Filter by origin type */
  originType?: 'native' | 'synthesized' | 'imported';

  /** Filter by status */
  status?: 'active' | 'deprecated' | 'disabled';

  /** Filter by minimum DQ score */
  minDQScore?: number;

  /** Filter by portability */
  isPortable?: boolean;

  /** Filter by name pattern (case-insensitive substring match) */
  namePattern?: string;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Result of listing skills.
 */
export interface SkillListResult {
  /** Matching skills */
  skills: SkillRegistration[];

  /** Total count (before pagination) */
  totalCount: number;

  /** Applied offset */
  offset: number;

  /** Applied limit */
  limit: number;
}

/**
 * MCP resource listing entry.
 */
export interface MCPResourceEntry {
  /** Resource URI */
  uri: string;

  /** Resource name */
  name: string;

  /** Resource description */
  description?: string;

  /** MIME type */
  mimeType: string;
}

/**
 * MCP tool listing entry.
 */
export interface MCPToolEntry {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Input schema */
  inputSchema: JSONSchema;
}

// =============================================================================
// MCP SKILL SERVER
// =============================================================================

/**
 * MCPSkillServer exposes skills as MCP resources and tools.
 *
 * Singleton pattern ensures consistent skill registry across the application.
 *
 * Usage:
 * ```typescript
 * const server = MCPSkillServer.getInstance();
 * server.registerSkillResource(mySkill);
 *
 * // List all skills
 * const skills = server.listSkills();
 *
 * // Get skill for transfer
 * const skill = server.readSkill(skillId);
 *
 * // Convert to MCP tool
 * const tool = server.exposeAsTool(skillId);
 * ```
 */
export class MCPSkillServer {
  private static instance: MCPSkillServer;

  /** In-memory skill registry */
  private registry: Map<string, SkillRegistration> = new Map();

  /** Server initialization time */
  private startedAt: number = Date.now();

  /** URI prefix for skill resources */
  private readonly uriPrefix = 'mcp://agent-genome/skills/';

  /** Tool name prefix */
  private readonly toolPrefix = 'genome_';

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  static getInstance(): MCPSkillServer {
    if (!MCPSkillServer.instance) {
      MCPSkillServer.instance = new MCPSkillServer();
    }
    return MCPSkillServer.instance;
  }

  /**
   * Reset the instance (for testing).
   */
  static resetInstance(): void {
    MCPSkillServer.instance = new MCPSkillServer();
  }

  // ---------------------------------------------------------------------------
  // SKILL REGISTRATION
  // ---------------------------------------------------------------------------

  /**
   * Register a skill and expose it as an MCP resource.
   *
   * @param skill - The SkillGenome to register
   * @returns MCPSkillResource for the registered skill
   * @throws Error if skill validation fails
   */
  registerSkillResource(skill: SkillGenome): MCPSkillResource {
    // Validate the skill genome
    skillGenomeCodec.validateSkillGenome(skill);

    // Ensure MCP resource is properly configured
    const mcpResource = this.ensureMCPResource(skill);

    // Create registration entry
    const registration: SkillRegistration = {
      skill: {
        ...skill,
        mcpResource,
      },
      status: 'active',
      stats: this.createInitialStats(),
      registeredAt: Date.now(),
    };

    // Store in registry
    this.registry.set(skill.id, registration);

    logger.info(`Registered skill: ${skill.name} (${skill.id})`, undefined, 'MCPServer');

    return mcpResource;
  }

  /**
   * Unregister a skill from the server.
   *
   * @param skillId - ID of the skill to unregister
   * @returns true if skill was unregistered, false if not found
   */
  unregisterSkill(skillId: string): boolean {
    const existed = this.registry.has(skillId);
    this.registry.delete(skillId);

    if (existed) {
      logger.info(`Unregistered skill: ${skillId}`, undefined, 'MCPServer');
    }

    return existed;
  }

  /**
   * Update a skill's status.
   *
   * @param skillId - ID of the skill to update
   * @param status - New status
   * @returns true if updated, false if not found
   */
  updateSkillStatus(
    skillId: string,
    status: 'active' | 'deprecated' | 'disabled'
  ): boolean {
    const registration = this.registry.get(skillId);
    if (!registration) {
      return false;
    }

    registration.status = status;
    return true;
  }

  // ---------------------------------------------------------------------------
  // SKILL LISTING
  // ---------------------------------------------------------------------------

  /**
   * List all registered skills with optional filtering.
   *
   * @param filter - Optional filter criteria
   * @returns SkillListResult with matching skills
   */
  listSkills(filter?: SkillFilter): SkillListResult {
    let skills = Array.from(this.registry.values());

    // Apply filters
    if (filter) {
      skills = this.applyFilters(skills, filter);
    }

    const totalCount = skills.length;

    // Apply pagination
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? skills.length;
    skills = skills.slice(offset, offset + limit);

    return {
      skills,
      totalCount,
      offset,
      limit,
    };
  }

  /**
   * List skills as MCP resource entries (for MCP resources/list).
   *
   * @param filter - Optional filter criteria
   * @returns Array of MCPResourceEntry
   */
  listAsResources(filter?: SkillFilter): MCPResourceEntry[] {
    const { skills } = this.listSkills(filter);

    return skills.map((reg) => ({
      uri: reg.skill.mcpResource.uri,
      name: reg.skill.name,
      description: reg.skill.description,
      mimeType: reg.skill.mcpResource.mimeType,
    }));
  }

  /**
   * List skills as MCP tool entries (for MCP tools/list).
   *
   * @param filter - Optional filter criteria
   * @returns Array of MCPToolEntry
   */
  listAsTools(filter?: SkillFilter): MCPToolEntry[] {
    const { skills } = this.listSkills({
      ...filter,
      status: filter?.status ?? 'active', // Only active skills as tools by default
    });

    return skills.map((reg) => ({
      name: reg.skill.mcpResource.toolSchema.name,
      description: reg.skill.mcpResource.toolSchema.description,
      inputSchema: reg.skill.mcpResource.toolSchema.inputSchema,
    }));
  }

  // ---------------------------------------------------------------------------
  // SKILL RETRIEVAL
  // ---------------------------------------------------------------------------

  /**
   * Read a skill's full genome for transfer.
   *
   * @param skillId - ID of the skill to read
   * @returns SkillGenome if found, null otherwise
   */
  readSkill(skillId: string): SkillGenome | null {
    const registration = this.registry.get(skillId);
    if (!registration) {
      return null;
    }

    // Update stats
    registration.stats.lastInvokedAt = Date.now();

    return registration.skill;
  }

  /**
   * Read a skill by its MCP resource URI.
   *
   * @param uri - MCP resource URI (mcp://agent-genome/skills/{id})
   * @returns SkillGenome if found, null otherwise
   */
  readSkillByUri(uri: string): SkillGenome | null {
    if (!uri.startsWith(this.uriPrefix)) {
      return null;
    }

    const skillId = uri.slice(this.uriPrefix.length);
    return this.readSkill(skillId);
  }

  /**
   * Get a skill's registration entry (includes stats).
   *
   * @param skillId - ID of the skill
   * @returns SkillRegistration if found, null otherwise
   */
  getRegistration(skillId: string): SkillRegistration | null {
    return this.registry.get(skillId) ?? null;
  }

  /**
   * Check if a skill is registered.
   *
   * @param skillId - ID of the skill to check
   * @returns true if registered, false otherwise
   */
  hasSkill(skillId: string): boolean {
    return this.registry.has(skillId);
  }

  // ---------------------------------------------------------------------------
  // MCP TOOL EXPOSURE
  // ---------------------------------------------------------------------------

  /**
   * Convert a skill to an MCP tool schema for invocation.
   *
   * @param skillId - ID of the skill to expose
   * @returns MCPToolSchema if found, null otherwise
   */
  exposeAsTool(skillId: string): MCPToolSchema | null {
    const registration = this.registry.get(skillId);
    if (!registration) {
      return null;
    }

    return registration.skill.mcpResource.toolSchema;
  }

  /**
   * Create an MCP tool schema from a skill genome.
   *
   * @param skill - The skill genome
   * @returns MCPToolSchema for MCP invocation
   */
  createToolSchema(skill: SkillGenome): MCPToolSchema {
    return {
      name: `${this.toolPrefix}${this.sanitizeToolName(skill.name)}`,
      description: this.createToolDescription(skill),
      inputSchema: skill.inputSchema,
    };
  }

  /**
   * Invoke a skill by its tool name (for MCP tools/call).
   *
   * @param toolName - Name of the tool (genome_*)
   * @param input - Tool input matching the skill's input schema
   * @returns Result of skill execution
   */
  async invokeByToolName(
    toolName: string,
    input: unknown
  ): Promise<{
    success: boolean;
    output: unknown;
    error?: string;
  }> {
    // Find skill by tool name
    const registration = this.findByToolName(toolName);
    if (!registration) {
      return {
        success: false,
        output: null,
        error: `Tool not found: ${toolName}`,
      };
    }

    // Validate input against schema
    const validation = skillGenomeCodec.validateAgainstSchema(
      input,
      registration.skill.inputSchema
    );
    if (!validation.valid) {
      return {
        success: false,
        output: null,
        error: `Invalid input: ${validation.errors.join(', ')}`,
      };
    }

    try {
      // Deserialize and execute the handler
      const handler = skillGenomeCodec.deserializeFunction(
        registration.skill.handler
      );

      const startTime = Date.now();
      const result = registration.skill.runtime === 'async'
        ? await Promise.race([
            handler(input),
            this.createTimeout(registration.skill.timeoutMs),
          ])
        : handler(input);

      // Update stats
      const latency = Date.now() - startTime;
      this.updateStats(registration, true, latency);

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      // Update stats for failure
      this.updateStats(registration, false, 0);

      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // STATS & METRICS
  // ---------------------------------------------------------------------------

  /**
   * Get aggregated server statistics.
   */
  getServerStats(): {
    totalSkills: number;
    activeSkills: number;
    deprecatedSkills: number;
    disabledSkills: number;
    totalInvocations: number;
    avgSuccessRate: number;
    avgDQScore: number;
    uptimeMs: number;
  } {
    const skills = Array.from(this.registry.values());

    const activeSkills = skills.filter((s) => s.status === 'active').length;
    const deprecatedSkills = skills.filter(
      (s) => s.status === 'deprecated'
    ).length;
    const disabledSkills = skills.filter((s) => s.status === 'disabled').length;

    const totalInvocations = skills.reduce(
      (sum, s) => sum + s.stats.invocations,
      0
    );

    const avgSuccessRate =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.stats.successRate, 0) / skills.length
        : 0;

    const avgDQScore =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.stats.avgDQScore, 0) / skills.length
        : 0;

    return {
      totalSkills: skills.length,
      activeSkills,
      deprecatedSkills,
      disabledSkills,
      totalInvocations,
      avgSuccessRate,
      avgDQScore,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  /**
   * Record a skill transfer (for stats tracking).
   *
   * @param skillId - ID of the transferred skill
   */
  recordTransfer(skillId: string): void {
    const registration = this.registry.get(skillId);
    if (registration) {
      registration.stats.transferCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Ensure a skill has a properly configured MCP resource.
   */
  private ensureMCPResource(skill: SkillGenome): MCPSkillResource {
    // Use existing if valid
    if (
      skill.mcpResource?.uri?.startsWith(this.uriPrefix) &&
      skill.mcpResource.toolSchema
    ) {
      return skill.mcpResource;
    }

    // Create new resource
    return {
      uri: `${this.uriPrefix}${skill.id}`,
      mimeType: 'application/json',
      toolSchema: this.createToolSchema(skill),
    };
  }

  /**
   * Apply filters to skill list.
   */
  private applyFilters(
    skills: SkillRegistration[],
    filter: SkillFilter
  ): SkillRegistration[] {
    return skills.filter((reg) => {
      // Status filter
      if (filter.status && reg.status !== filter.status) {
        return false;
      }

      // Tags filter (any match)
      if (
        filter.tags &&
        filter.tags.length > 0 &&
        !filter.tags.some((tag) => reg.skill.tags.includes(tag))
      ) {
        return false;
      }

      // Origin type filter
      if (filter.originType && reg.skill.origin.type !== filter.originType) {
        return false;
      }

      // DQ score filter
      if (
        filter.minDQScore !== undefined &&
        reg.skill.dqScore < filter.minDQScore
      ) {
        return false;
      }

      // Portability filter
      if (
        filter.isPortable !== undefined &&
        reg.skill.portability.isPortable !== filter.isPortable
      ) {
        return false;
      }

      // Name pattern filter
      if (filter.namePattern) {
        const pattern = filter.namePattern.toLowerCase();
        if (!reg.skill.name.toLowerCase().includes(pattern)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Find a skill by its tool name.
   */
  private findByToolName(toolName: string): SkillRegistration | null {
    const registrations = Array.from(this.registry.values());
    for (const registration of registrations) {
      if (registration.skill.mcpResource.toolSchema.name === toolName) {
        return registration;
      }
    }
    return null;
  }

  /**
   * Sanitize a skill name for use as a tool name.
   */
  private sanitizeToolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Create a tool description from a skill.
   */
  private createToolDescription(skill: SkillGenome): string {
    const tagString = skill.tags.length > 0 ? ` [${skill.tags.join(', ')}]` : '';
    return `${skill.description}${tagString} (v${skill.version})`;
  }

  /**
   * Create initial stats for a new registration.
   */
  private createInitialStats(): SkillStats {
    return {
      invocations: 0,
      successRate: 1.0,
      avgLatencyMs: 0,
      avgDQScore: 0,
      transferCount: 0,
    };
  }

  /**
   * Update stats after a skill invocation.
   */
  private updateStats(
    registration: SkillRegistration,
    success: boolean,
    latencyMs: number
  ): void {
    const stats = registration.stats;
    const n = ++stats.invocations;

    // Update success rate
    stats.successRate = ((stats.successRate * (n - 1)) + (success ? 1 : 0)) / n;

    // Update average latency (only for successful invocations)
    if (success && latencyMs > 0) {
      stats.avgLatencyMs = ((stats.avgLatencyMs * (n - 1)) + latencyMs) / n;
    }

    // Update DQ score (use skill's dqScore for now)
    stats.avgDQScore =
      ((stats.avgDQScore * (n - 1)) + registration.skill.dqScore) / n;

    stats.lastInvokedAt = Date.now();
  }

  /**
   * Create a timeout promise for skill execution.
   */
  private createTimeout(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Skill execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default MCPSkillServer instance.
 */
export const mcpSkillServer = MCPSkillServer.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Register a skill with the default server.
 */
export function registerSkill(skill: SkillGenome): MCPSkillResource {
  return mcpSkillServer.registerSkillResource(skill);
}

/**
 * List skills from the default server.
 */
export function listSkills(filter?: SkillFilter): SkillListResult {
  return mcpSkillServer.listSkills(filter);
}

/**
 * Read a skill from the default server.
 */
export function readSkill(skillId: string): SkillGenome | null {
  return mcpSkillServer.readSkill(skillId);
}

/**
 * Expose a skill as an MCP tool.
 */
export function exposeAsTool(skillId: string): MCPToolSchema | null {
  return mcpSkillServer.exposeAsTool(skillId);
}
