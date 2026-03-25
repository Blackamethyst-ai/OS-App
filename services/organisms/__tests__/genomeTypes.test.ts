/**
 * Tests for Agent Genome Types
 *
 * Validates type structures, interfaces, and type compatibility
 * for the SkillGenome type system.
 */

import { describe, it, expect } from 'vitest';
import type {
  SkillGenome,
  JSONSchema,
  SerializedFunction,
  SkillRef,
  MCPSkillResource,
  MCPToolSchema,
  PortabilitySpec,
  OrthogonalDimension,
  SkillOrigin,
  SynthesisPattern,
  SynthesisRequest,
  SynthesisConstraints,
  SynthesizedSkill,
  ExecutionPlan,
  ExecutionStep,
  PortableSkillPackage,
  OrthogonalSkillVector,
  CompatibilityReport,
  SkillRegistration,
  SkillStats,
} from '../genome/types';

// Helper to create a valid SkillGenome for testing
function createTestSkillGenome(overrides: Partial<SkillGenome> = {}): SkillGenome {
  const now = Date.now();
  return {
    id: 'test-skill-001',
    version: '1.0.0',
    name: 'Test Skill',
    description: 'A test skill',
    tags: ['test'],
    inputSchema: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] },
    outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
    handler: { body: 'return input;', params: ['input'], isAsync: false },
    dependencies: [],
    runtime: 'sync',
    timeoutMs: 5000,
    mcpResource: {
      uri: 'mcp://agent-genome/skills/test-skill-001',
      mimeType: 'application/json',
      toolSchema: {
        name: 'genome_test_skill',
        description: 'A test skill',
        inputSchema: { type: 'object' },
      },
    },
    portability: {
      isPortable: true,
      requiresContext: [],
      compatibility: [],
      orthogonalDimensions: [],
    },
    origin: { type: 'native', createdAt: now, createdBy: 'test' },
    checksum: 'abc123',
    dqScore: 0.85,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Agent Genome Types', () => {
  describe('SkillGenome interface', () => {
    it('should allow creation of a valid SkillGenome object', () => {
      const skill = createTestSkillGenome();

      expect(skill.id).toBe('test-skill-001');
      expect(skill.version).toBe('1.0.0');
      expect(skill.name).toBe('Test Skill');
      expect(skill.runtime).toBe('sync');
      expect(skill.timeoutMs).toBe(5000);
      expect(skill.dqScore).toBe(0.85);
      expect(skill.tags).toContain('test');
    });

    it('should support async runtime', () => {
      const skill = createTestSkillGenome({ runtime: 'async' });
      expect(skill.runtime).toBe('async');
    });

    it('should support all origin types', () => {
      const native = createTestSkillGenome({ origin: { type: 'native', createdAt: Date.now() } });
      const synthesized = createTestSkillGenome({
        origin: { type: 'synthesized', parentSkills: ['a', 'b'], createdAt: Date.now() },
      });
      const imported = createTestSkillGenome({
        origin: { type: 'imported', sourceAgent: 'agent-x', createdAt: Date.now() },
      });

      expect(native.origin.type).toBe('native');
      expect(synthesized.origin.type).toBe('synthesized');
      expect(synthesized.origin.parentSkills).toEqual(['a', 'b']);
      expect(imported.origin.type).toBe('imported');
      expect(imported.origin.sourceAgent).toBe('agent-x');
    });
  });

  describe('JSONSchema interface', () => {
    it('should support all basic JSON Schema types', () => {
      const types: JSONSchema['type'][] = ['object', 'array', 'string', 'number', 'boolean', 'null'];
      types.forEach((type) => {
        const schema: JSONSchema = { type };
        expect(schema.type).toBe(type);
      });
    });

    it('should support nested object schemas with properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          age: { type: 'number', minimum: 0, maximum: 150 },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['name'],
      };

      expect(schema.properties?.name?.type).toBe('string');
      expect(schema.properties?.age?.minimum).toBe(0);
      expect(schema.properties?.tags?.items?.type).toBe('string');
      expect(schema.required).toContain('name');
    });

    it('should support enum, pattern, default, and description fields', () => {
      const schema: JSONSchema = {
        type: 'string',
        enum: ['a', 'b', 'c'],
        pattern: '^[a-z]+$',
        default: 'a',
        description: 'A letter',
      };

      expect(schema.enum).toHaveLength(3);
      expect(schema.pattern).toBe('^[a-z]+$');
      expect(schema.default).toBe('a');
      expect(schema.description).toBe('A letter');
    });
  });

  describe('SerializedFunction interface', () => {
    it('should represent a serialized function with body, params, and async flag', () => {
      const fn: SerializedFunction = {
        body: 'return input.value * 2;',
        params: ['input'],
        isAsync: false,
        sourceLocation: 'test.ts:10',
      };

      expect(fn.body).toContain('return');
      expect(fn.params).toEqual(['input']);
      expect(fn.isAsync).toBe(false);
      expect(fn.sourceLocation).toBe('test.ts:10');
    });

    it('should allow sourceLocation to be optional', () => {
      const fn: SerializedFunction = {
        body: 'return 42;',
        params: [],
        isAsync: true,
      };

      expect(fn.sourceLocation).toBeUndefined();
      expect(fn.isAsync).toBe(true);
    });
  });

  describe('PortabilitySpec and OrthogonalDimension', () => {
    it('should support portability configuration', () => {
      const spec: PortabilitySpec = {
        isPortable: true,
        requiresContext: ['user', 'session'],
        compatibility: ['genome', 'swarm'],
        orthogonalDimensions: [
          { type: 'knowledge', name: 'domain', weight: 0.4 },
          { type: 'skill', name: 'execution', weight: 0.35 },
          { type: 'context', name: 'environment', weight: 0.25, embedding: [0.1, 0.2] },
        ],
      };

      expect(spec.isPortable).toBe(true);
      expect(spec.requiresContext).toHaveLength(2);
      expect(spec.compatibility).toContain('genome');
      expect(spec.orthogonalDimensions).toHaveLength(3);
      expect(spec.orthogonalDimensions[2].embedding).toEqual([0.1, 0.2]);
    });

    it('should validate orthogonal dimension types', () => {
      const dimensionTypes: OrthogonalDimension['type'][] = ['knowledge', 'skill', 'context'];
      dimensionTypes.forEach((type) => {
        const dim: OrthogonalDimension = { type, name: type, weight: 0.33 };
        expect(dim.type).toBe(type);
      });
    });
  });

  describe('SynthesisPattern and SynthesisRequest', () => {
    it('should support all synthesis patterns', () => {
      const patterns: SynthesisPattern[] = ['sequential', 'parallel', 'conditional', 'feedback_loop'];
      patterns.forEach((p) => {
        expect(typeof p).toBe('string');
      });
      expect(patterns).toHaveLength(4);
    });

    it('should create a valid synthesis request with constraints', () => {
      const request: SynthesisRequest = {
        baseSkills: ['skill-a', 'skill-b'],
        pattern: 'sequential',
        goal: 'Combine two skills',
        constraints: {
          maxTimeoutMs: 10000,
          minDQScore: 0.7,
          outputSchema: { type: 'object' },
          excludeSkills: ['skill-c'],
        },
      };

      expect(request.baseSkills).toHaveLength(2);
      expect(request.pattern).toBe('sequential');
      expect(request.constraints?.maxTimeoutMs).toBe(10000);
      expect(request.constraints?.excludeSkills).toContain('skill-c');
    });
  });

  describe('PortableSkillPackage and OrthogonalSkillVector', () => {
    it('should create a valid portable skill package', () => {
      const pkg: PortableSkillPackage = {
        skill: createTestSkillGenome(),
        orthogonalVector: {
          knowledge: [0.1, 0.2],
          skill: [0.3, 0.4],
          context: [0.5, 0.6],
          dimensions: 2,
        },
        transfer: {
          exportedAt: Date.now(),
          exportedBy: 'agent-a',
          targetAgent: 'agent-b',
          signature: 'past:12345678',
        },
      };

      expect(pkg.skill.id).toBe('test-skill-001');
      expect(pkg.orthogonalVector.dimensions).toBe(2);
      expect(pkg.transfer.exportedBy).toBe('agent-a');
      expect(pkg.transfer.signature).toMatch(/^past:/);
    });
  });

  describe('SkillRegistration and SkillStats', () => {
    it('should create a valid skill registration', () => {
      const registration: SkillRegistration = {
        skill: createTestSkillGenome(),
        status: 'active',
        stats: {
          invocations: 100,
          successRate: 0.95,
          avgLatencyMs: 42,
          avgDQScore: 0.88,
          transferCount: 3,
          lastInvokedAt: Date.now(),
        },
        registeredAt: Date.now(),
      };

      expect(registration.status).toBe('active');
      expect(registration.stats.invocations).toBe(100);
      expect(registration.stats.successRate).toBe(0.95);
    });

    it('should support all registration statuses', () => {
      const statuses: SkillRegistration['status'][] = ['active', 'deprecated', 'disabled'];
      statuses.forEach((s) => expect(typeof s).toBe('string'));
      expect(statuses).toHaveLength(3);
    });
  });
});
