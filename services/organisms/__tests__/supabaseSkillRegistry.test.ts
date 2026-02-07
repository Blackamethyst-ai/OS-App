/**
 * SupabaseSkillRegistry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseSkillRegistry } from '../genome/supabaseSkillRegistry';
import type { SkillGenome } from '../genome/types';

describe('SupabaseSkillRegistry', () => {
  let registry: SupabaseSkillRegistry;

  // Helper to create test skill
  const createTestSkill = (id: string, name: string): SkillGenome => ({
    id,
    version: '1.0.0',
    name,
    description: `Test skill ${name}`,
    tags: ['test'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    handler: {
      body: 'return input;',
      params: ['input', 'context'],
      isAsync: false,
    },
    dependencies: [],
    runtime: 'sync',
    timeoutMs: 5000,
    mcpResource: {
      uri: `mcp://agent-genome/skills/${id}`,
      name,
      description: `Test skill ${name}`,
      mimeType: 'application/json',
    },
    portability: {
      isPortable: true,
      requiredCapabilities: [],
      platformConstraints: [],
      estimatedTransferCost: 0,
      orthogonalDecomposition: [],
    },
    origin: {
      type: 'native',
      agentId: 'test-agent',
      timestamp: Date.now(),
    },
    checksum: 'test-checksum-' + id,
    dqScore: 0.8,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(() => {
    registry = new SupabaseSkillRegistry();
  });

  // ---------------------------------------------------------------------------
  // Cache Operations (Without Supabase)
  // ---------------------------------------------------------------------------

  describe('In-Memory Cache Operations', () => {
    it('should register and retrieve skills', () => {
      const skill = createTestSkill('skill-1', 'TestSkill1');
      registry.register(skill);

      expect(registry.get('skill-1')).toEqual(skill);
      expect(registry.size()).toBe(1);
    });

    it('should retrieve by name (case-insensitive)', () => {
      const skill = createTestSkill('skill-2', 'TestSkill2');
      registry.register(skill);

      expect(registry.getByName('testskill2')).toEqual(skill);
      expect(registry.getByName('TESTSKILL2')).toEqual(skill);
      expect(registry.getByName('TestSkill2')).toEqual(skill);
    });

    it('should get all skills', () => {
      const skill1 = createTestSkill('skill-3', 'TestSkill3');
      const skill2 = createTestSkill('skill-4', 'TestSkill4');

      registry.register(skill1);
      registry.register(skill2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(skill1);
      expect(all).toContainEqual(skill2);
    });

    it('should unregister skills', () => {
      const skill = createTestSkill('skill-5', 'TestSkill5');
      registry.register(skill);

      expect(registry.size()).toBe(1);
      const result = registry.unregister('skill-5');
      expect(result).toBe(true);
      expect(registry.size()).toBe(0);
      expect(registry.get('skill-5')).toBeUndefined();
    });

    it('should return false when unregistering non-existent skill', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should clear all skills', () => {
      const skill1 = createTestSkill('skill-6', 'TestSkill6');
      const skill2 = createTestSkill('skill-7', 'TestSkill7');

      registry.register(skill1);
      registry.register(skill2);
      expect(registry.size()).toBe(2);

      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should update name index on registration', () => {
      const skill1 = createTestSkill('skill-8', 'DuplicateName');
      const skill2 = createTestSkill('skill-9', 'DuplicateName'); // Same name, different ID

      registry.register(skill1);
      registry.register(skill2);

      // Name index should point to latest registration
      expect(registry.getByName('duplicatename')).toEqual(skill2);
      expect(registry.get('skill-8')).toEqual(skill1); // Original still in map by ID
    });
  });

  // ---------------------------------------------------------------------------
  // Hydration
  // ---------------------------------------------------------------------------

  describe('Hydration', () => {
    it('should hydrate from Supabase when configured', async () => {
      const count = await registry.hydrate();
      // Supabase is configured, so we should get a number (could be 0 if DB is empty)
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should be idempotent', async () => {
      const count1 = await registry.hydrate();
      const count2 = await registry.hydrate();

      // Second hydration should return same count (already hydrated)
      expect(count1).toBe(count2);
    });

    it('should merge with existing cache on hydration', async () => {
      const skill = createTestSkill('skill-persist-test', 'PersistTest');
      registry.register(skill);
      const cacheSizeBefore = registry.size();
      expect(cacheSizeBefore).toBeGreaterThanOrEqual(1);

      const hydratedCount = await registry.hydrate();
      const cacheSizeAfter = registry.size();

      // Cache should include both in-memory and hydrated skills
      expect(cacheSizeAfter).toBeGreaterThanOrEqual(cacheSizeBefore);
      expect(registry.get('skill-persist-test')).toEqual(skill);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle get on empty registry', () => {
      expect(registry.get('non-existent')).toBeUndefined();
      expect(registry.getByName('non-existent')).toBeUndefined();
    });

    it('should handle clear on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
      expect(registry.size()).toBe(0);
    });

    it('should return 0 size on new registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return empty array on getAll for empty registry', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });
});
