/**
 * Tests for Seed Skills Library
 *
 * Validates seed skill creation, structure, registration, and handler logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SEED_SKILLS, registerSeedSkills } from '../genome/seedSkills';
import type { SkillGenome } from '../genome/types';

describe('Seed Skills Library', () => {
  describe('SEED_SKILLS array', () => {
    it('should export exactly 8 seed skills', () => {
      expect(SEED_SKILLS).toHaveLength(8);
    });

    it('should have unique names for all skills', () => {
      const names = SEED_SKILLS.map((s) => s.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should include the "seed" tag on every skill', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.tags).toContain('seed');
      });
    });

    it('should have unique IDs starting with "seed_"', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.id).toMatch(/^seed_/);
      });

      const ids = SEED_SKILLS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid MCP resource URIs for all skills', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.mcpResource.uri).toMatch(/^mcp:\/\/agent-genome\/skills\//);
        expect(skill.mcpResource.mimeType).toBe('application/json');
        expect(skill.mcpResource.toolSchema.name).toMatch(/^genome_/);
      });
    });

    it('should have version 1.0.0 for all seed skills', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.version).toBe('1.0.0');
      });
    });

    it('should have native origin for all seed skills', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.origin.type).toBe('native');
        expect(skill.origin.createdBy).toBe('seed-library');
        expect(skill.origin.createdAt).toBeGreaterThan(0);
      });
    });

    it('should mark all seed skills as portable', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.portability.isPortable).toBe(true);
        expect(skill.portability.requiresContext).toEqual([]);
      });
    });

    it('should have no dependencies for all seed skills', () => {
      SEED_SKILLS.forEach((skill) => {
        expect(skill.dependencies).toEqual([]);
      });
    });
  });

  describe('Individual seed skill structure', () => {
    it('should have JSON Parse skill with correct schema', () => {
      const jsonParse = SEED_SKILLS.find((s) => s.name === 'JSON Parse');
      expect(jsonParse).toBeDefined();
      expect(jsonParse!.inputSchema.type).toBe('object');
      expect(jsonParse!.inputSchema.required).toContain('input');
      expect(jsonParse!.handler.isAsync).toBe(false);
      expect(jsonParse!.runtime).toBe('sync');
    });

    it('should have DQ Scorer skill with custom dqScore', () => {
      const dqScorer = SEED_SKILLS.find((s) => s.name === 'DQ Scorer');
      expect(dqScorer).toBeDefined();
      expect(dqScorer!.dqScore).toBe(0.95);
      expect(dqScorer!.tags).toContain('dq');
    });

    it('should have Basic Statistics skill with array input', () => {
      const stats = SEED_SKILLS.find((s) => s.name === 'Basic Statistics');
      expect(stats).toBeDefined();
      expect(stats!.inputSchema.properties?.values?.type).toBe('array');
      expect(stats!.inputSchema.required).toContain('values');
    });

    it('should have Word Count skill with text analysis tags', () => {
      const wordCount = SEED_SKILLS.find((s) => s.name === 'Word Count');
      expect(wordCount).toBeDefined();
      expect(wordCount!.tags).toContain('text');
      expect(wordCount!.tags).toContain('analysis');
    });

    it('should default to 5000ms timeout and 0.85 dqScore', () => {
      const regularSkills = SEED_SKILLS.filter((s) => s.name !== 'DQ Scorer');
      regularSkills.forEach((skill) => {
        expect(skill.timeoutMs).toBe(5000);
        expect(skill.dqScore).toBe(0.85);
      });
    });
  });

  describe('registerSeedSkills', () => {
    let mockRegistry: { register: any; getAll: any };
    let mockMcpServer: { registerSkillResource: any };

    beforeEach(() => {
      mockRegistry = {
        register: vi.fn(),
        getAll: vi.fn().mockReturnValue([]),
      };
      mockMcpServer = {
        registerSkillResource: vi.fn(),
      };
    });

    it('should register all 8 skills when registry is empty', () => {
      const result = registerSeedSkills(mockRegistry, mockMcpServer);

      expect(result.registered).toBe(8);
      expect(result.skipped).toBe(0);
      expect(mockRegistry.register).toHaveBeenCalledTimes(8);
      expect(mockMcpServer.registerSkillResource).toHaveBeenCalledTimes(8);
    });

    it('should skip already registered skills by name', () => {
      mockRegistry.getAll.mockReturnValue([
        { name: 'JSON Parse' },
        { name: 'Word Count' },
      ] as SkillGenome[]);

      const result = registerSeedSkills(mockRegistry, mockMcpServer);

      expect(result.registered).toBe(6);
      expect(result.skipped).toBe(2);
      expect(mockRegistry.register).toHaveBeenCalledTimes(6);
    });

    it('should skip all skills if all already registered', () => {
      mockRegistry.getAll.mockReturnValue(
        SEED_SKILLS.map((s) => ({ name: s.name })) as SkillGenome[]
      );

      const result = registerSeedSkills(mockRegistry, mockMcpServer);

      expect(result.registered).toBe(0);
      expect(result.skipped).toBe(8);
      expect(mockRegistry.register).not.toHaveBeenCalled();
      expect(mockMcpServer.registerSkillResource).not.toHaveBeenCalled();
    });

    it('should call both registry.register and mcpServer.registerSkillResource for each new skill', () => {
      registerSeedSkills(mockRegistry, mockMcpServer);

      // Verify each registered skill was also registered with MCP
      for (let i = 0; i < 8; i++) {
        const registeredSkill = mockRegistry.register.mock.calls[i][0];
        const mcpSkill = mockMcpServer.registerSkillResource.mock.calls[i][0];
        expect(registeredSkill).toBe(mcpSkill);
      }
    });
  });
});
