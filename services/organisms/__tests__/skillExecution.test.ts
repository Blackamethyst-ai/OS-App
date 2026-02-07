/**
 * Skill Execution Tests
 *
 * Tests that GenomeLayer correctly executes skill handlers
 * via the bridgeSkillToCapability and dispatch('execute') paths.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GenomeLayer } from '../GenomeLayer';
import type { OrganismTask } from '../../archon/types';
import type { SkillGenome } from '../genome/types';

describe('Skill Execution', () => {
  let layer: GenomeLayer;

  const createExecutableSkill = (
    id: string,
    name: string,
    body: string,
    options: {
      params?: string[];
      isAsync?: boolean;
      runtime?: 'sync' | 'async';
      timeoutMs?: number;
    } = {}
  ): SkillGenome => ({
    id,
    version: '1.0.0',
    name,
    description: `Executable skill: ${name}`,
    tags: ['test', 'executable'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    handler: {
      body,
      params: options.params || ['input'],
      isAsync: options.isAsync || false,
    },
    dependencies: [],
    runtime: options.runtime || 'sync',
    timeoutMs: options.timeoutMs || 5000,
    mcpResource: {
      uri: `mcp://agent-genome/skills/${id}`,
      mimeType: 'application/json',
      toolSchema: {
        name: `genome_${name.toLowerCase().replace(/\s+/g, '_')}`,
        description: `Executable skill: ${name}`,
        inputSchema: { type: 'object' },
      },
    },
    portability: {
      isPortable: true,
      requiresContext: [],
      compatibility: [],
      orthogonalDimensions: [],
    },
    origin: {
      type: 'native',
      createdAt: Date.now(),
      createdBy: 'test',
    },
    checksum: `test-checksum-${id}`,
    dqScore: 0.8,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(async () => {
    layer = new GenomeLayer();
    await layer.initialize();
  });

  // ---------------------------------------------------------------------------
  // Direct execution via executeSkill
  // ---------------------------------------------------------------------------

  describe('executeSkill', () => {
    it('should execute a sync skill handler', async () => {
      const skill = createExecutableSkill(
        'exec-sync-1',
        'SyncAdd',
        'return { sum: input.a + input.b };'
      );

      const result = await layer.executeSkill(skill, { a: 3, b: 4 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sum: 7 });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute an async skill handler', async () => {
      const skill = createExecutableSkill(
        'exec-async-1',
        'AsyncDouble',
        'return { doubled: input.value * 2 };',
        { isAsync: true, runtime: 'async' }
      );

      const result = await layer.executeSkill(skill, { value: 21 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ doubled: 42 });
    });

    it('should handle handler errors gracefully', async () => {
      const skill = createExecutableSkill(
        'exec-error-1',
        'ErrorSkill',
        'throw new Error("Intentional test error");'
      );

      const result = await layer.executeSkill(skill, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Intentional test error');
    });

    it('should time out slow skills', async () => {
      const skill = createExecutableSkill(
        'exec-timeout-1',
        'SlowSkill',
        'return new Promise(function(resolve) { setTimeout(function() { resolve({ done: true }); }, 5000); });',
        { isAsync: true, runtime: 'async', timeoutMs: 50 }
      );

      const result = await layer.executeSkill(skill, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should pass input correctly to handler', async () => {
      const skill = createExecutableSkill(
        'exec-passthrough-1',
        'Echo',
        'return { received: input };'
      );

      const input = { name: 'test', nested: { value: 42 } };
      const result = await layer.executeSkill(skill, input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ received: input });
    });
  });

  // ---------------------------------------------------------------------------
  // Dispatch 'execute' operation
  // ---------------------------------------------------------------------------

  describe('dispatch execute', () => {
    it('should execute a registered skill by ID', async () => {
      const skill = createExecutableSkill(
        'dispatch-exec-1',
        'DispatchAdd',
        'return { result: input.x + input.y };'
      );

      // Register the skill first
      await layer.dispatch({
        intent: 'register',
        contextPages: [JSON.stringify(skill)],
        metadata: {},
      });

      // Execute via dispatch
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: ['dispatch-exec-1', JSON.stringify({ x: 10, y: 20 })],
        metadata: {},
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 30 });
    });

    it('should execute a registered skill by name', async () => {
      const skill = createExecutableSkill(
        'dispatch-name-1',
        'NamedSkill',
        'return { hello: "world" };'
      );

      await layer.dispatch({
        intent: 'register',
        contextPages: [JSON.stringify(skill)],
        metadata: {},
      });

      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: ['NamedSkill', '{}'],
        metadata: {},
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ hello: 'world' });
    });

    it('should return error for unknown skill', async () => {
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: ['nonexistent-skill', '{}'],
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when no skill ID provided', async () => {
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: [],
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No skill ID');
    });
  });

  // ---------------------------------------------------------------------------
  // Seed skills
  // ---------------------------------------------------------------------------

  describe('Seed Skills', () => {
    it('should have seed skills registered after init', async () => {
      const listResult = await layer.dispatch({
        intent: 'list',
        contextPages: [],
        metadata: {},
      });

      expect(listResult.success).toBe(true);
      const output = listResult.output as any;
      expect(output.skills.length).toBeGreaterThanOrEqual(8); // 8 seed skills
    });

    it('should execute the DQ Scorer seed skill', async () => {
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: [
          'DQ Scorer',
          JSON.stringify({ validity: 0.9, specificity: 0.8, correctness: 0.7 }),
        ],
        metadata: {},
      });

      expect(result.success).toBe(true);
      const data = result.output as any;
      // 0.9*0.4 + 0.8*0.3 + 0.7*0.3 = 0.36 + 0.24 + 0.21 = 0.81
      expect(data.score).toBeCloseTo(0.81, 2);
      expect(data.isActionable).toBe(true);
    });

    it('should execute the Word Count seed skill', async () => {
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: [
          'Word Count',
          JSON.stringify({ text: 'Hello world. This is a test.' }),
        ],
        metadata: {},
      });

      expect(result.success).toBe(true);
      const data = result.output as any;
      expect(data.words).toBe(6);
      expect(data.sentences).toBe(2);
    });

    it('should execute the Basic Statistics seed skill', async () => {
      const result = await layer.dispatch({
        intent: 'execute',
        contextPages: [
          'Basic Statistics',
          JSON.stringify({ values: [1, 2, 3, 4, 5] }),
        ],
        metadata: {},
      });

      expect(result.success).toBe(true);
      const data = result.output as any;
      expect(data.mean).toBe(3);
      expect(data.median).toBe(3);
      expect(data.min).toBe(1);
      expect(data.max).toBe(5);
      expect(data.count).toBe(5);
    });
  });
});
