/**
 * GenomeLayer - Agent Genome Concrete Implementation
 *
 * Wires together the genome subsystem components:
 * - codec: Skill serialization/deserialization
 * - mcpServer: MCP protocol skill exposure
 * - skillWeaver: Skill synthesis engine
 * - portableTransfer: Skill import/export (PaST)
 *
 * Research basis:
 * - arXiv:2504.07079 (SkillWeaver) - 31.8% improvement via skill synthesis
 * - arXiv:2512.23880 (CASCADE) - 93.3% autonomous skill creation
 * - arXiv:2601.11258 (PaST) - Orthogonal knowledge/skill decomposition
 */

import type {
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  SubsystemType,
} from '../archon/types';

import { AbstractOrganismLayer, organismRegistry } from './OrganismLayer';
import { skillGenomeCodec } from './genome/codec';
import { mcpSkillServer } from './genome/mcpServer';
import { portableSkillTransfer } from './genome/portableTransfer';
import { createSkillWeaver, InMemorySkillRegistry } from './genome/skillWeaver';
import type { SkillGenome, SynthesisRequest, SynthesizedSkill } from './genome/types';
import type { SkillWeaver, SkillRegistry } from './genome/skillWeaver';

// =============================================================================
// GENOME LAYER
// =============================================================================

/**
 * GenomeLayer handles all skill-related operations:
 * - encode/decode: Skill serialization
 * - transfer: Skill import/export between agents
 * - synthesize: Create new skills from existing ones
 * - register: Expose skills via MCP
 */
export class GenomeLayer extends AbstractOrganismLayer {
  // Subsystem interface
  id: SubsystemType = 'genome';
  name = 'Agent Genome';
  capabilities = [
    'skill-encoding',
    'skill-transfer',
    'skill-synthesis',
    'mcp-exposure',
  ];
  layerType: 'genome' | 'swarm' | 'cognitive' = 'genome';

  // Components
  private codec = skillGenomeCodec;
  private mcpServer = mcpSkillServer;
  private transfer = portableSkillTransfer;
  private skillWeaver: SkillWeaver;
  private skillRegistry: SkillRegistry;

  // Layer-specific metrics
  private encodeCount = 0;
  private decodeCount = 0;
  private transferCount = 0;
  private synthesisCount = 0;
  private synthesisSuccessCount = 0;

  constructor() {
    super();
    this.skillRegistry = new InMemorySkillRegistry();
    this.skillWeaver = createSkillWeaver(this.skillRegistry);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  protected async onInitialize(): Promise<void> {
    console.log(`${this.name}: Genome components initialized`);
  }

  protected async onShutdown(): Promise<void> {
    console.log(`${this.name}: Genome components shutdown`);
  }

  // ---------------------------------------------------------------------------
  // Task Dispatch
  // ---------------------------------------------------------------------------

  async dispatch(task: OrganismTask): Promise<OrganismResult> {
    return this.executeWithMetrics(task, async () => {
      const operation = this.parseOperation(task.intent);

      switch (operation) {
        case 'encode':
          return this.handleEncode(task);
        case 'decode':
          return this.handleDecode(task);
        case 'transfer_export':
        case 'export':
          return this.handleExport(task);
        case 'transfer_import':
        case 'import':
          return this.handleImport(task);
        case 'synthesize':
          return this.handleSynthesize(task);
        case 'register':
          return this.handleRegister(task);
        case 'list':
          return this.handleList(task);
        default:
          return this.createErrorResult(
            `Unknown genome operation: ${operation}`,
            task
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Operation Handlers
  // ---------------------------------------------------------------------------

  private async handleEncode(task: OrganismTask): Promise<OrganismResult> {
    const skill = this.extractSkillFromTask(task);
    if (!skill) {
      return this.createErrorResult('No skill data provided for encoding', task);
    }

    const encoded = this.codec.serialize(skill, true);
    this.encodeCount++;

    return this.createSuccessResult(encoded, task, {
      operation: 'encode',
      skillId: skill.id,
      bytes: encoded.length,
    });
  }

  private async handleDecode(task: OrganismTask): Promise<OrganismResult> {
    const json = task.contextPages[0];
    if (!json) {
      return this.createErrorResult('No JSON data provided for decoding', task);
    }

    const skill = this.codec.deserialize(json);
    this.decodeCount++;

    return this.createSuccessResult(skill, task, {
      operation: 'decode',
      skillId: skill.id,
      valid: true,
    });
  }

  private async handleExport(task: OrganismTask): Promise<OrganismResult> {
    const skill = this.extractSkillFromTask(task);
    if (!skill) {
      return this.createErrorResult('No skill data provided for export', task);
    }

    const targetAgent = task.contextPages[1] || undefined;
    const portable = this.transfer.exportPortable(skill, targetAgent);
    this.transferCount++;

    return this.createSuccessResult(portable, task, {
      operation: 'export',
      skillId: skill.id,
      targetAgent,
    });
  }

  private async handleImport(task: OrganismTask): Promise<OrganismResult> {
    const packageJson = task.contextPages[0];
    const targetAgent = task.contextPages[1] || 'local';
    if (!packageJson) {
      return this.createErrorResult('No package data provided for import', task);
    }

    const portablePackage = JSON.parse(packageJson);
    const imported = this.transfer.importPortable(portablePackage, targetAgent);
    this.transferCount++;

    return this.createSuccessResult(imported, task, {
      operation: 'import',
      skillId: imported.id,
      adapted: true,
    });
  }

  private async handleSynthesize(task: OrganismTask): Promise<OrganismResult> {
    const requestJson = task.contextPages[0];
    if (!requestJson) {
      return this.createErrorResult('No synthesis request provided', task);
    }

    const request: SynthesisRequest = JSON.parse(requestJson);
    this.synthesisCount++;

    // Synthesize using skillWeaver (takes baseSkills, pattern, goal)
    const result: SynthesizedSkill = await this.skillWeaver.synthesize(
      request.baseSkills,
      request.pattern,
      request.goal || 'synthesize_skill'
    );

    if (result.validation.isActionable) {
      this.synthesisSuccessCount++;
    }

    return this.createSuccessResult(result, task, {
      operation: 'synthesize',
      pattern: request.pattern,
      baseSkillCount: request.baseSkills.length,
      dqScore: result.validation.score,
      success: result.validation.isActionable,
    });
  }

  private async handleRegister(task: OrganismTask): Promise<OrganismResult> {
    const skill = this.extractSkillFromTask(task);
    if (!skill) {
      return this.createErrorResult('No skill data provided for registration', task);
    }

    // Register with MCP server for external exposure
    this.mcpServer.registerSkillResource(skill);

    // Also add to local registry for synthesis
    (this.skillRegistry as InMemorySkillRegistry).register(skill);

    return this.createSuccessResult(
      { registered: true, skillId: skill.id },
      task,
      { operation: 'register', skillId: skill.id }
    );
  }

  private async handleList(task: OrganismTask): Promise<OrganismResult> {
    const filterJson = task.contextPages[0];
    const filter = filterJson ? JSON.parse(filterJson) : undefined;

    const skills = this.mcpServer.listSkills(filter);

    return this.createSuccessResult(skills, task, {
      operation: 'list',
      count: skills.skills.length,
    });
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getLayerMetrics(): OrganismMetrics {
    const base = this.getBaseMetrics();

    return {
      ...base,
      // Genome-specific metrics
      skillsRegistered: this.skillRegistry.getAll().length,
      skillTransfers: this.transferCount,
      synthesisAttempts: this.synthesisCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseOperation(intent: string): string {
    return intent.toLowerCase().split(':')[0].trim();
  }

  private extractSkillFromTask(task: OrganismTask): SkillGenome | null {
    const skillJson = task.contextPages[0];
    if (!skillJson) return null;

    try {
      return JSON.parse(skillJson) as SkillGenome;
    } catch {
      return null;
    }
  }

  private createSuccessResult(
    output: unknown,
    task: OrganismTask,
    metadata: Record<string, unknown> = {}
  ): OrganismResult {
    return {
      success: true,
      output,
      dqScore: this.computeDQScore(),
      metadata: {
        layerId: this.id,
        latencyMs: 0,
        tokensUsed: 0,
        ...metadata,
      },
    };
  }

  private createErrorResult(error: string, _task: OrganismTask): OrganismResult {
    return {
      success: false,
      output: null,
      dqScore: {
        score: 0,
        components: { validity: 0, specificity: 0, correctness: 0 },
        isActionable: false,
        timestamp: Date.now(),
      },
      metadata: {
        layerId: this.id,
        latencyMs: 0,
        tokensUsed: 0,
      },
      error,
    };
  }
}

// =============================================================================
// SINGLETON & REGISTRATION
// =============================================================================

/** Singleton instance */
export const genomeLayer = new GenomeLayer();

/** Register with organism registry */
organismRegistry.register(genomeLayer);
