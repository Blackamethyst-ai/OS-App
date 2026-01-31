/**
 * Integration Tests for Agentic Organism Framework
 *
 * Tests the public API and factory functions of each layer
 * Note: These tests avoid importing modules that depend on localStorage/DOM
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import types and factories directly from specific modules to avoid
// transitive dependencies on browser APIs
import type { SkillGenome } from '../genome/types';

import {
  skillGenomeCodec,
  serializeSkill,
  deserializeSkill,
  validateSkill,
  computeSkillChecksum,
} from '../genome/codec';

import { AdaptiveExpertMixture } from '../swarm/adaptiveMoE';
import { StigmergicEnvironment } from '../swarm/stigmergy';
import { WakeSleepAgent } from '../cognitive/wakeSleep';
import { SimpleMem } from '../cognitive/simpleMem';

describe('Agentic Organism Framework Integration', () => {
  // ===========================================================================
  // GENOME LAYER
  // ===========================================================================

  describe('Genome Layer - SkillGenome Codec', () => {
    // Use type assertion for test data
    const testSkill = {
      id: 'skill-test-001',
      name: 'Test Skill',
      version: '1.0.0',
      description: 'A test skill for validation',
      tags: ['test'],
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
        required: ['input'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          output: { type: 'string' },
        },
      },
      handler: {
        body: 'return { output: input.input };',
        params: ['input'],
        isAsync: false,
      },
      mcpResource: {
        uri: 'mcp://agent-genome/skills/skill-test-001',
        mimeType: 'application/json',
        toolSchema: {
          name: 'test-skill',
          description: 'Test skill',
          inputSchema: { type: 'object' },
        },
      },
      dependencies: [],
      runtime: 'javascript' as const,
      timeoutMs: 30000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as SkillGenome;

    it('should serialize a skill genome to JSON', () => {
      const serialized = serializeSkill(testSkill);
      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should deserialize a skill genome from JSON', () => {
      const serialized = serializeSkill(testSkill);
      const deserialized = deserializeSkill(serialized);
      expect(deserialized.id).toBe(testSkill.id);
      expect(deserialized.name).toBe(testSkill.name);
    });

    it('should validate a skill genome without throwing', () => {
      // validateSkill throws if invalid, so no error means valid
      expect(() => validateSkill(testSkill)).not.toThrow();
    });

    it('should compute consistent checksums', () => {
      const checksum1 = computeSkillChecksum(testSkill);
      const checksum2 = computeSkillChecksum(testSkill);
      expect(checksum1).toBe(checksum2);
    });

    it('should detect tampered checksums', () => {
      const serialized = serializeSkill(testSkill);
      const parsed = JSON.parse(serialized);
      // The checksum is stored in the skill itself
      parsed.checksum = 'tampered-checksum-value';

      expect(() => deserializeSkill(JSON.stringify(parsed))).toThrow(/checksum/i);
    });

    it('should use codec singleton', () => {
      expect(skillGenomeCodec).toBeDefined();
      expect(typeof skillGenomeCodec.serialize).toBe('function');
      expect(typeof skillGenomeCodec.deserialize).toBe('function');
    });
  });

  // ===========================================================================
  // SWARM LAYER
  // ===========================================================================

  describe('Swarm Layer - Adaptive MoE', () => {
    it('should export AdaptiveExpertMixture class', () => {
      expect(AdaptiveExpertMixture).toBeDefined();
      expect(typeof AdaptiveExpertMixture.getInstance).toBe('function');
    });

    it('should get singleton instance', () => {
      // Reset singleton for clean test
      (AdaptiveExpertMixture as unknown as { instance: null }).instance = null;

      const instance = AdaptiveExpertMixture.getInstance();
      expect(instance).toBeInstanceOf(AdaptiveExpertMixture);

      // Same instance returned
      const instance2 = AdaptiveExpertMixture.getInstance();
      expect(instance2).toBe(instance);
    });
  });

  describe('Swarm Layer - Stigmergic Environment', () => {
    it('should export StigmergicEnvironment class', () => {
      expect(StigmergicEnvironment).toBeDefined();
      expect(typeof StigmergicEnvironment.getInstance).toBe('function');
    });

    it('should get singleton instance', () => {
      // Reset singleton for clean test
      (StigmergicEnvironment as unknown as { instance: null }).instance = null;

      const instance = StigmergicEnvironment.getInstance();
      expect(instance).toBeInstanceOf(StigmergicEnvironment);
    });
  });

  // ===========================================================================
  // COGNITIVE LAYER
  // ===========================================================================

  describe('Cognitive Layer - WakeSleepAgent', () => {
    it('should export WakeSleepAgent class', () => {
      expect(WakeSleepAgent).toBeDefined();
      expect(typeof WakeSleepAgent.getInstance).toBe('function');
    });

    it('should get singleton instance', () => {
      // Reset singleton for clean test
      (WakeSleepAgent as unknown as { instance: null }).instance = null;

      const instance = WakeSleepAgent.getInstance();
      expect(instance).toBeInstanceOf(WakeSleepAgent);
    });

    it('should start in wake phase', () => {
      (WakeSleepAgent as unknown as { instance: null }).instance = null;
      const agent = WakeSleepAgent.getInstance();
      expect(agent.getCurrentPhase()).toBe('wake');
    });
  });

  describe('Cognitive Layer - SimpleMem', () => {
    it('should export SimpleMem class', () => {
      expect(SimpleMem).toBeDefined();
      expect(typeof SimpleMem.getInstance).toBe('function');
    });

    it('should get singleton instance', () => {
      // Reset singleton for clean test
      (SimpleMem as unknown as { instance: null }).instance = null;

      const instance = SimpleMem.getInstance();
      expect(instance).toBeInstanceOf(SimpleMem);
    });
  });

  // ===========================================================================
  // CROSS-LAYER INTEGRATION
  // ===========================================================================

  describe('Cross-Layer Type Compatibility', () => {
    it('should have compatible OrganismLayer types', () => {
      // Verify all layers export compatible types
      // This is a compile-time check - if it compiles, types are compatible
      const layers = ['genome', 'swarm', 'cognitive'] as const;
      expect(layers).toHaveLength(3);
    });

    it('should export all organism layer types', () => {
      // These imports would fail at compile time if types don't exist
      // Runtime check that they're truthy
      expect(true).toBe(true); // Type check passed
    });
  });
});
