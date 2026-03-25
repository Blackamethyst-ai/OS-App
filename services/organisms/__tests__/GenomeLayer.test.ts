/**
 * Tests for GenomeLayer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrganismTask } from '../../archon/types';

// Mock all external dependencies — factory functions cannot reference outer variables
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../genome/codec', () => ({
  skillGenomeCodec: {
    serialize: vi.fn((skill: unknown) => JSON.stringify(skill)),
    deserialize: vi.fn((json: string) => JSON.parse(json)),
    validateAgainstSchema: vi.fn(() => ({ valid: true, errors: [] })),
    deserializeFunction: vi.fn(() => (args: unknown) => ({ result: 'ok', args })),
  },
}));

vi.mock('../genome/mcpServer', () => ({
  mcpSkillServer: {
    registerSkillResource: vi.fn(),
    listSkills: vi.fn(() => ({ skills: [] })),
  },
}));

vi.mock('../genome/portableTransfer', () => ({
  portableSkillTransfer: {
    exportPortable: vi.fn((skill: unknown) => ({ portable: true, skill })),
    importPortable: vi.fn((pkg: unknown) => ({ id: 'imported-1', ...(pkg as object) })),
  },
}));

vi.mock('../genome/skillWeaver', () => ({
  createSkillWeaver: vi.fn(() => ({
    synthesize: vi.fn(async () => ({
      id: 'synth-1',
      validation: { score: 0.9, isActionable: true },
    })),
  })),
}));

vi.mock('../genome/supabaseSkillRegistry', () => {
  class MockSupabaseSkillRegistry {
    private skills: unknown[] = [];
    async hydrate() { return 0; }
    register = vi.fn();
    getAll() { return this.skills; }
  }
  return {
    SupabaseSkillRegistry: MockSupabaseSkillRegistry,
  };
});

vi.mock('../../capabilities/providers/dynamic', () => ({
  registerDynamicCapability: vi.fn(),
}));

vi.mock('../genome/seedSkills', () => ({
  registerSeedSkills: vi.fn(() => ({ registered: 0, skipped: 0 })),
}));

// Must import AFTER vi.mock calls
import { GenomeLayer } from '../GenomeLayer';
import { skillGenomeCodec } from '../genome/codec';
import { mcpSkillServer } from '../genome/mcpServer';
import { portableSkillTransfer } from '../genome/portableTransfer';

describe('GenomeLayer', () => {
  let layer: GenomeLayer;

  beforeEach(() => {
    vi.clearAllMocks();
    layer = new GenomeLayer();
  });

  describe('constructor', () => {
    it('should set correct id and layerType', () => {
      expect(layer.id).toBe('genome');
      expect(layer.layerType).toBe('genome');
      expect(layer.name).toBe('Agent Genome');
    });

    it('should have genome-specific capabilities', () => {
      expect(layer.capabilities).toContain('skill-encoding');
      expect(layer.capabilities).toContain('skill-transfer');
      expect(layer.capabilities).toContain('skill-synthesis');
      expect(layer.capabilities).toContain('mcp-exposure');
    });
  });

  describe('dispatch — encode', () => {
    it('should encode a skill from contextPages', async () => {
      const skill = { id: 'sk1', name: 'TestSkill' };
      const task: OrganismTask = {
        intent: 'encode',
        contextPages: [JSON.stringify(skill)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(skillGenomeCodec.serialize).toHaveBeenCalledWith(skill, true);
    });

    it('should return error if no skill data provided', async () => {
      const task: OrganismTask = {
        intent: 'encode',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No skill data provided');
    });
  });

  describe('dispatch — decode', () => {
    it('should decode JSON from contextPages', async () => {
      const skill = { id: 'sk1', name: 'TestSkill' };
      const task: OrganismTask = {
        intent: 'decode',
        contextPages: [JSON.stringify(skill)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(skillGenomeCodec.deserialize).toHaveBeenCalledWith(JSON.stringify(skill));
    });

    it('should return error if no JSON provided', async () => {
      const task: OrganismTask = {
        intent: 'decode',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON data provided');
    });
  });

  describe('dispatch — export', () => {
    it('should export a skill as portable package', async () => {
      const skill = { id: 'sk1', name: 'TestSkill' };
      const task: OrganismTask = {
        intent: 'export',
        contextPages: [JSON.stringify(skill), 'target-agent'],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(portableSkillTransfer.exportPortable).toHaveBeenCalledWith(skill, 'target-agent');
    });
  });

  describe('dispatch — import', () => {
    it('should import a portable skill package', async () => {
      const pkg = { id: 'pkg1', skills: [] };
      const task: OrganismTask = {
        intent: 'import',
        contextPages: [JSON.stringify(pkg), 'local-agent'],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(portableSkillTransfer.importPortable).toHaveBeenCalled();
    });

    it('should return error if no package data', async () => {
      const task: OrganismTask = {
        intent: 'import',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No package data provided');
    });
  });

  describe('dispatch — synthesize', () => {
    it('should synthesize a new skill', async () => {
      const request = {
        baseSkills: [{ id: 's1' }, { id: 's2' }],
        pattern: 'merge',
        goal: 'create_combo',
      };
      const task: OrganismTask = {
        intent: 'synthesize',
        contextPages: [JSON.stringify(request)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
    });

    it('should return error if no synthesis request', async () => {
      const task: OrganismTask = {
        intent: 'synthesize',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No synthesis request provided');
    });
  });

  describe('dispatch — register', () => {
    it('should register a skill with MCP and registry', async () => {
      const skill = { id: 'sk1', name: 'TestSkill', description: 'test', origin: { type: 'manual' }, dqScore: 0.8, inputSchema: {}, outputSchema: {} };
      const task: OrganismTask = {
        intent: 'register',
        contextPages: [JSON.stringify(skill)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(mcpSkillServer.registerSkillResource).toHaveBeenCalledWith(skill);
    });
  });

  describe('dispatch — list', () => {
    it('should list skills', async () => {
      (mcpSkillServer.listSkills as ReturnType<typeof vi.fn>).mockReturnValue({ skills: [{ id: 's1' }] });
      const task: OrganismTask = {
        intent: 'list',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(mcpSkillServer.listSkills).toHaveBeenCalled();
    });
  });

  describe('dispatch — execute', () => {
    it('should return error for missing skill ID', async () => {
      const task: OrganismTask = {
        intent: 'execute',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No skill ID provided');
    });

    it('should return error for unknown skill', async () => {
      const task: OrganismTask = {
        intent: 'execute',
        contextPages: ['nonexistent'],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Skill not found');
    });
  });

  describe('dispatch — unknown operation', () => {
    it('should return error for unknown operation', async () => {
      const task: OrganismTask = {
        intent: 'frobnicate',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown genome operation');
    });
  });

  describe('getLayerMetrics()', () => {
    it('should return base metrics plus genome-specific fields', () => {
      const metrics = layer.getLayerMetrics();
      expect(metrics.invocations).toBe(0);
      expect(metrics.successRate).toBe(1.0);
      expect('skillsRegistered' in metrics).toBe(true);
      expect('skillTransfers' in metrics).toBe(true);
      expect('synthesisAttempts' in metrics).toBe(true);
    });
  });
});
