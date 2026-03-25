/**
 * Tests for SkillWeaver - Skill Synthesis Engine
 *
 * Validates skill composition, pattern execution, validation, and caching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../genome/codec', () => ({
  skillGenomeCodec: {
    validateSkillGenome: vi.fn(),
    computeChecksum: vi.fn(() => 'mock-checksum-abc123'),
  },
}));

import {
  SkillWeaver,
  InMemorySkillRegistry,
  createSkillWeaver,
} from '../genome/skillWeaver';
import type { SkillGenome } from '../genome/types';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockSkill(overrides: Partial<SkillGenome> = {}): SkillGenome {
  const id = overrides.id || `skill-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    version: '1.0.0',
    name: overrides.name || `Skill ${id}`,
    description: overrides.description || 'A mock skill for testing with enough chars to pass specificity checks',
    tags: overrides.tags || ['test', 'mock'],
    inputSchema: overrides.inputSchema || {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    outputSchema: overrides.outputSchema || {
      type: 'object',
      properties: { result: { type: 'string' } },
    },
    handler: overrides.handler || {
      body: 'return { result: input.query };',
      params: ['input'],
      isAsync: false,
    },
    dependencies: overrides.dependencies || [],
    runtime: overrides.runtime || 'async',
    timeoutMs: overrides.timeoutMs || 5000,
    mcpResource: overrides.mcpResource || {
      uri: `mcp://agent-genome/skills/${id}`,
      mimeType: 'application/json',
      toolSchema: {
        name: `genome_skill_${id}`,
        description: 'Mock skill',
        inputSchema: { type: 'object' },
      },
    },
    portability: overrides.portability || {
      isPortable: true,
      requiresContext: [],
      compatibility: ['genome' as any],
      orthogonalDimensions: [],
    },
    origin: overrides.origin || {
      type: 'native',
      createdAt: Date.now(),
    },
    checksum: 'original-checksum',
    dqScore: overrides.dqScore || 0.8,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as SkillGenome;
}

describe('InMemorySkillRegistry', () => {
  let registry: InMemorySkillRegistry;

  beforeEach(() => {
    registry = new InMemorySkillRegistry();
  });

  it('should register and retrieve skills by id', () => {
    const skill = createMockSkill({ id: 'reg-1', name: 'Alpha' });
    registry.register(skill);
    expect(registry.get('reg-1')).toBe(skill);
    expect(registry.size()).toBe(1);
  });

  it('should retrieve skills by name (case-insensitive)', () => {
    const skill = createMockSkill({ id: 'reg-2', name: 'Beta Skill' });
    registry.register(skill);
    expect(registry.getByName('beta skill')).toBe(skill);
    expect(registry.getByName('BETA SKILL')).toBe(skill);
  });

  it('should return undefined for non-existent skills', () => {
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.getByName('nope')).toBeUndefined();
  });

  it('should unregister skills', () => {
    const skill = createMockSkill({ id: 'reg-3', name: 'Gamma' });
    registry.register(skill);
    expect(registry.unregister('reg-3')).toBe(true);
    expect(registry.get('reg-3')).toBeUndefined();
    expect(registry.size()).toBe(0);
  });

  it('should return false when unregistering non-existent skill', () => {
    expect(registry.unregister('nope')).toBe(false);
  });

  it('should clear all skills', () => {
    registry.register(createMockSkill({ id: 'a', name: 'A' }));
    registry.register(createMockSkill({ id: 'b', name: 'B' }));
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });

  it('should return all skills via getAll()', () => {
    registry.register(createMockSkill({ id: 'x', name: 'X' }));
    registry.register(createMockSkill({ id: 'y', name: 'Y' }));
    expect(registry.getAll()).toHaveLength(2);
  });
});

describe('SkillWeaver', () => {
  let registry: InMemorySkillRegistry;
  let weaver: SkillWeaver;

  beforeEach(() => {
    registry = new InMemorySkillRegistry();
    weaver = new SkillWeaver(registry);
  });

  // ---------------------------------------------------------------------------
  // compose()
  // ---------------------------------------------------------------------------

  describe('compose()', () => {
    it('should compose skills sequentially', () => {
      const skillA = createMockSkill({ id: 'a', name: 'SkillA', timeoutMs: 1000 });
      const skillB = createMockSkill({ id: 'b', name: 'SkillB', timeoutMs: 2000 });

      const plan = weaver.compose([skillA, skillB], 'sequential');

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].id).toBe('seq_step_0');
      expect(plan.steps[1].id).toBe('seq_step_1');
      expect(plan.steps[1].dependsOn).toEqual(['seq_step_0']);
      expect(plan.estimatedTimeMs).toBe(3000);
    });

    it('should compose skills in parallel with merge step', () => {
      const skillA = createMockSkill({ id: 'a', name: 'SkillA', timeoutMs: 1000 });
      const skillB = createMockSkill({ id: 'b', name: 'SkillB', timeoutMs: 3000 });

      const plan = weaver.compose([skillA, skillB], 'parallel');

      // 2 parallel + 1 merge
      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].dependsOn).toEqual([]);
      expect(plan.steps[1].dependsOn).toEqual([]);
      expect(plan.steps[2].id).toBe('par_merge');
      expect(plan.steps[2].dependsOn).toContain('par_step_0');
      expect(plan.steps[2].dependsOn).toContain('par_step_1');
      // Estimated time is max + 100
      expect(plan.estimatedTimeMs).toBe(3100);
    });

    it('should compose conditional pattern with branches', () => {
      const skillA = createMockSkill({ id: 'a', name: 'SkillA' });
      const skillB = createMockSkill({ id: 'b', name: 'SkillB' });

      const plan = weaver.compose([skillA, skillB], 'conditional');

      // condition eval + 2 branches + merge
      expect(plan.steps).toHaveLength(4);
      expect(plan.steps[0].id).toBe('cond_eval');
      expect(plan.steps[1].id).toBe('cond_branch_0');
      expect(plan.steps[2].id).toBe('cond_branch_1');
      expect(plan.steps[3].id).toBe('cond_merge');
    });

    it('should compose feedback loop pattern', () => {
      const executor = createMockSkill({ id: 'exec', name: 'Executor' });
      const critic = createMockSkill({ id: 'crit', name: 'Critic' });

      const plan = weaver.compose([executor, critic], 'feedback_loop');

      expect(plan.steps.some(s => s.id === 'loop_executor')).toBe(true);
      expect(plan.steps.some(s => s.id === 'loop_critic')).toBe(true);
      expect(plan.steps.some(s => s.id === 'loop_control')).toBe(true);
    });

    it('should throw on unknown pattern', () => {
      const skill = createMockSkill();
      expect(() => weaver.compose([skill], 'unknown' as any)).toThrow('Unknown synthesis pattern');
    });
  });

  // ---------------------------------------------------------------------------
  // validateSynthesis()
  // ---------------------------------------------------------------------------

  describe('validateSynthesis()', () => {
    it('should return a valid DQ score for well-formed skill', () => {
      const skill = createMockSkill({
        handler: { body: 'return { result: "hello" };', params: ['input'], isAsync: false },
      });

      return weaver.validateSynthesis(skill).then(dq => {
        expect(dq.score).toBeGreaterThan(0);
        expect(dq.score).toBeLessThanOrEqual(1);
        expect(dq.components).toHaveProperty('validity');
        expect(dq.components).toHaveProperty('specificity');
        expect(dq.components).toHaveProperty('correctness');
        expect(typeof dq.timestamp).toBe('number');
      });
    });

    it('should return score 0 when validation fails', async () => {
      const { skillGenomeCodec } = await import('../genome/codec');
      (skillGenomeCodec.validateSkillGenome as any).mockImplementationOnce(() => {
        throw new Error('Invalid');
      });

      const skill = createMockSkill();
      const dq = await weaver.validateSynthesis(skill);
      expect(dq.score).toBe(0);
      expect(dq.isActionable).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // synthesize()
  // ---------------------------------------------------------------------------

  describe('synthesize()', () => {
    it('should synthesize a skill from registered skills', async () => {
      const sharedSchema = { type: 'object' as const, properties: { data: { type: 'string' as const } } };
      const skillA = createMockSkill({ id: 'sa', name: 'SkillA', inputSchema: sharedSchema, outputSchema: sharedSchema });
      const skillB = createMockSkill({ id: 'sb', name: 'SkillB', inputSchema: sharedSchema, outputSchema: sharedSchema });
      registry.register(skillA);
      registry.register(skillB);

      const result = await weaver.synthesize(['sa', 'sb'], 'sequential', 'combine two skills');

      expect(result.skill).toBeDefined();
      expect(result.skill.origin.type).toBe('synthesized');
      expect(result.skill.origin.parentSkills).toEqual(['sa', 'sb']);
      expect(result.skill.origin.synthesisPattern).toBe('sequential');
      expect(result.executionPlan.steps).toHaveLength(2);
      expect(result.metadata.baseSkillCount).toBe(2);
      expect(result.metadata.patternsUsed).toBe('sequential');
    });

    it('should throw when no valid skills are found', async () => {
      await expect(
        weaver.synthesize(['nonexistent'], 'sequential', 'goal')
      ).rejects.toThrow('No valid skills found');
    });

    it('should resolve skills by name as well as ID', async () => {
      const skill = createMockSkill({ id: 'by-name-id', name: 'ByNameSkill' });
      registry.register(skill);

      const result = await weaver.synthesize(['ByNameSkill'], 'sequential', 'resolve by name');
      expect(result.skill).toBeDefined();
      expect(result.metadata.baseSkillCount).toBe(1);
    });

    it('should use cached result on repeated synthesis', async () => {
      const skill = createMockSkill({ id: 'cache-1', name: 'CacheSkill' });
      registry.register(skill);

      const first = await weaver.synthesize(['cache-1'], 'sequential', 'cache test');
      const second = await weaver.synthesize(['cache-1'], 'sequential', 'cache test');

      expect(first).toBe(second); // Same reference from cache
    });

    it('should not use cache after clearCache()', async () => {
      const skill = createMockSkill({ id: 'cache-2', name: 'CacheSkill2' });
      registry.register(skill);

      const first = await weaver.synthesize(['cache-2'], 'sequential', 'clear test');
      weaver.clearCache();
      const second = await weaver.synthesize(['cache-2'], 'sequential', 'clear test');

      expect(first).not.toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // Validation helpers (via synthesize output)
  // ---------------------------------------------------------------------------

  describe('validation compatibility', () => {
    it('should throw on sequential incompatible schemas', () => {
      const skillA = createMockSkill({
        id: 'incompat-a',
        name: 'IncompatA',
        outputSchema: { type: 'string' },
      });
      const skillB = createMockSkill({
        id: 'incompat-b',
        name: 'IncompatB',
        inputSchema: { type: 'number' },
      });
      registry.register(skillA);
      registry.register(skillB);

      return expect(
        weaver.synthesize(['incompat-a', 'incompat-b'], 'sequential', 'fail')
      ).rejects.toThrow('Schema incompatibility');
    });

    it('should throw when conditional pattern has less than 2 skills', () => {
      const skill = createMockSkill({ id: 'solo', name: 'Solo' });
      registry.register(skill);

      return expect(
        weaver.synthesize(['solo'], 'conditional', 'fail')
      ).rejects.toThrow('Conditional pattern requires at least 2 skills');
    });

    it('should throw when feedback_loop pattern has less than 2 skills', () => {
      const skill = createMockSkill({ id: 'solo2', name: 'Solo2' });
      registry.register(skill);

      return expect(
        weaver.synthesize(['solo2'], 'feedback_loop', 'fail')
      ).rejects.toThrow('Feedback loop requires at least 2 skills');
    });
  });
});

describe('createSkillWeaver()', () => {
  it('should create a SkillWeaver instance', () => {
    const registry = new InMemorySkillRegistry();
    const weaver = createSkillWeaver(registry);
    expect(weaver).toBeInstanceOf(SkillWeaver);
  });

  it('should accept custom config', () => {
    const registry = new InMemorySkillRegistry();
    const weaver = createSkillWeaver(registry, { defaultDQThreshold: 0.9 });
    expect(weaver).toBeInstanceOf(SkillWeaver);
  });
});
