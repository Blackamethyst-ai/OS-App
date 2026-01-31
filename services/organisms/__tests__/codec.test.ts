/**
 * Tests for SkillGenome Codec
 *
 * Validates serialization, deserialization, and checksum verification
 */

import { describe, it, expect } from 'vitest';
import {
  skillGenomeCodec,
  serializeSkill,
  deserializeSkill,
  validateSkill,
  computeSkillChecksum,
} from '../genome/codec';
import type { SkillGenome } from '../genome/types';

describe('SkillGenomeCodec', () => {
  const sampleSkill: SkillGenome = {
    id: 'test-skill-001',
    name: 'Test Skill',
    version: '1.0.0',
    description: 'A test skill for validation',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
    },
    handler: {
      body: 'return { result: input.query.toUpperCase() };',
      params: ['input'],
    },
    mcpResource: {
      uri: 'mcp://agent-genome/skills/test-skill-001',
      name: 'Test Skill',
      mimeType: 'application/json',
    },
  };

  describe('serialize', () => {
    it('should serialize a skill to JSON string', () => {
      const serialized = skillGenomeCodec.serialize(sampleSkill);
      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should include checksum in serialized output', () => {
      const serialized = skillGenomeCodec.serialize(sampleSkill);
      const parsed = JSON.parse(serialized);
      expect(parsed.checksum).toBeDefined();
      expect(typeof parsed.checksum).toBe('string');
    });
  });

  describe('deserialize', () => {
    it('should deserialize a valid JSON string', () => {
      const serialized = skillGenomeCodec.serialize(sampleSkill);
      const deserialized = skillGenomeCodec.deserialize(serialized);
      expect(deserialized.id).toBe(sampleSkill.id);
      expect(deserialized.name).toBe(sampleSkill.name);
    });

    it('should throw on invalid JSON', () => {
      expect(() => skillGenomeCodec.deserialize('not json')).toThrow();
    });

    it('should throw on tampered checksum', () => {
      const serialized = skillGenomeCodec.serialize(sampleSkill);
      const parsed = JSON.parse(serialized);
      parsed.checksum = 'tampered-checksum';
      expect(() =>
        skillGenomeCodec.deserialize(JSON.stringify(parsed))
      ).toThrow(/checksum/i);
    });
  });

  describe('validate', () => {
    it('should not throw for valid skill', () => {
      // validateSkillGenome throws if invalid
      expect(() => skillGenomeCodec.validateSkillGenome(sampleSkill)).not.toThrow();
    });

    it('should throw for skill without id', () => {
      const invalid = { ...sampleSkill, id: undefined } as unknown as SkillGenome;
      expect(() => skillGenomeCodec.validateSkillGenome(invalid)).toThrow(/Missing id/);
    });

    it('should throw for skill without name', () => {
      const invalid = { ...sampleSkill, name: undefined } as unknown as SkillGenome;
      expect(() => skillGenomeCodec.validateSkillGenome(invalid)).toThrow(/Missing name/);
    });
  });

  describe('computeChecksum', () => {
    it('should produce consistent checksums', () => {
      const checksum1 = skillGenomeCodec.computeChecksum(sampleSkill);
      const checksum2 = skillGenomeCodec.computeChecksum(sampleSkill);
      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different handlers', () => {
      const modifiedSkill = {
        ...sampleSkill,
        handler: {
          body: 'return { result: "different" };',
          params: ['input'],
        },
      };
      const checksum1 = skillGenomeCodec.computeChecksum(sampleSkill);
      const checksum2 = skillGenomeCodec.computeChecksum(modifiedSkill);
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('helper functions', () => {
    it('serializeSkill should work', () => {
      const result = serializeSkill(sampleSkill);
      expect(typeof result).toBe('string');
    });

    it('deserializeSkill should work', () => {
      const serialized = serializeSkill(sampleSkill);
      const result = deserializeSkill(serialized);
      expect(result.id).toBe(sampleSkill.id);
    });

    it('validateSkill should not throw for valid skill', () => {
      expect(() => validateSkill(sampleSkill)).not.toThrow();
    });

    it('computeSkillChecksum should work', () => {
      const checksum = computeSkillChecksum(sampleSkill);
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });
  });
});
