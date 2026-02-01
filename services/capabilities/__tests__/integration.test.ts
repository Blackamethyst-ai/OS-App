/**
 * Capabilities Registry Integration Tests
 *
 * Tests for capability registration, execution, and epoch synchronization.
 * These tests focus on the registry mechanics without loading all providers
 * to avoid browser API dependencies.
 *
 * Implements US-009: Integration Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerCapability,
  registerCapabilities,
  unregisterCapability,
  executeCapability,
  getCapability,
  getAllCapabilities,
  getStats,
  clearRegistry,
  searchCapabilities,
  getGeminiManifests,
  generateVoiceContext,
} from '../registry';
import { useSystemMind } from '../../../stores/useSystemMind';
import type { Capability } from '../types';

// Helper to create test capabilities
function createCapability(overrides?: Partial<Capability>): Capability {
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    kind: 'action',
    description: 'Test capability',
    complexity: 'simple',
    executionPath: 'direct',
    source: 'core',
    sectors: [],
    priority: 50,
    handler: async (args) => ({ success: true, result: args }),
    ...overrides,
  };
}

describe('Capabilities Registry Integration', () => {
  beforeEach(() => {
    // Reset registry and SystemMind state
    clearRegistry();
    useSystemMind.setState({
      epoch: 0,
      lastEpochChange: 0,
      lastEpochReason: null,
      actionRegistry: {},
    });
  });

  describe('Registration & Retrieval', () => {
    it('registers a single capability', () => {
      const cap = createCapability({ id: 'single_cap' });
      registerCapability(cap);

      const retrieved = getCapability('single_cap');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('single_cap');
    });

    it('registers multiple capabilities', () => {
      const caps = [
        createCapability({ id: 'multi_1' }),
        createCapability({ id: 'multi_2' }),
        createCapability({ id: 'multi_3' }),
      ];
      registerCapabilities(caps);

      const stats = getStats();
      expect(stats.total).toBe(3);
    });

    it('unregisters a capability', () => {
      const cap = createCapability({ id: 'to_remove' });
      registerCapability(cap);
      expect(getCapability('to_remove')).toBeDefined();

      const removed = unregisterCapability('to_remove');
      expect(removed).toBe(true);
      expect(getCapability('to_remove')).toBeUndefined();
    });

    it('returns all capabilities', () => {
      registerCapabilities([
        createCapability({ id: 'all_1' }),
        createCapability({ id: 'all_2' }),
      ]);

      const all = getAllCapabilities();
      expect(all.length).toBe(2);
    });
  });

  describe('Execution', () => {
    it('executes capability handler', async () => {
      registerCapability(
        createCapability({
          id: 'exec_test',
          handler: async (args) => ({ success: true, data: args.input }),
        })
      );

      const result = await executeCapability('exec_test', { input: 'hello' });
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent capability', async () => {
      const result = await executeCapability('does_not_exist', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('captures handler errors', async () => {
      registerCapability(
        createCapability({
          id: 'error_test',
          handler: async () => {
            throw new Error('Handler error');
          },
        })
      );

      const result = await executeCapability('error_test', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler error');
    });

    it('measures execution timing', async () => {
      registerCapability(
        createCapability({
          id: 'timing_test',
          handler: async () => {
            await new Promise((r) => setTimeout(r, 10));
            return { success: true };
          },
        })
      );

      const result = await executeCapability('timing_test', {});
      expect(result.timing).toBeGreaterThan(0);
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      registerCapabilities([
        createCapability({ id: 'search_nav', description: 'Navigate to dashboard' }),
        createCapability({ id: 'search_theme', description: 'Switch theme' }),
        createCapability({ id: 'search_voice', description: 'Toggle voice' }),
      ]);
    });

    it('searches by ID', () => {
      const matches = searchCapabilities('search_nav');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].capability.id).toBe('search_nav');
    });

    it('searches by description', () => {
      const matches = searchCapabilities('dashboard');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].capability.description).toContain('dashboard');
    });

    it('returns empty for no matches', () => {
      const matches = searchCapabilities('nonexistent_xyz');
      expect(matches.length).toBe(0);
    });
  });

  describe('Epoch Synchronization (US-001)', () => {
    it('increments epoch on registration', () => {
      const before = useSystemMind.getState().epoch;
      registerCapability(createCapability());
      const after = useSystemMind.getState().epoch;
      expect(after).toBeGreaterThan(before);
    });

    it('increments epoch on unregistration', () => {
      registerCapability(createCapability({ id: 'epoch_unreg' }));
      const before = useSystemMind.getState().epoch;
      unregisterCapability('epoch_unreg');
      const after = useSystemMind.getState().epoch;
      expect(after).toBeGreaterThan(before);
    });

    it('notifies epoch subscribers', () => {
      const listener = vi.fn();
      const unsub = useSystemMind.getState().subscribeToEpoch(listener);

      registerCapability(createCapability());
      expect(listener).toHaveBeenCalled();

      unsub();
    });

    it('registers action in SystemMind actionRegistry', () => {
      registerCapability(createCapability({ id: 'systemmind_action' }));

      const { actionRegistry } = useSystemMind.getState();
      expect(actionRegistry['systemmind_action']).toBeDefined();
    });
  });

  describe('Gemini Integration', () => {
    it('generates manifests for capabilities with schemas', () => {
      registerCapability(
        createCapability({
          id: 'gemini_cap',
          schema: {
            type: 'object',
            properties: {
              theme: { type: 'string' },
            },
            required: ['theme'],
          },
        })
      );

      const manifests = getGeminiManifests();
      expect(manifests.length).toBe(1);
      expect(manifests[0].name).toBe('gemini_cap');
    });

    it('excludes capabilities without schemas', () => {
      registerCapability(createCapability({ id: 'no_schema' }));

      const manifests = getGeminiManifests();
      expect(manifests.length).toBe(0);
    });
  });

  describe('Voice Context', () => {
    it('generates voice context for sector', () => {
      registerCapability(
        createCapability({
          id: 'voice_cap',
          sectors: ['DASHBOARD'],
          examples: ['test command'],
        })
      );

      const context = generateVoiceContext('DASHBOARD');
      expect(context.sector).toBe('DASHBOARD');
      expect(context.capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('tracks capability counts by kind', () => {
      registerCapabilities([
        createCapability({ id: 's1', kind: 'action' }),
        createCapability({ id: 's2', kind: 'action' }),
        createCapability({ id: 's3', kind: 'navigation' }),
      ]);

      const stats = getStats();
      expect(stats.byKind.action).toBe(2);
      expect(stats.byKind.navigation).toBe(1);
    });

    it('tracks capability counts by source', () => {
      registerCapabilities([
        createCapability({ id: 'src1', source: 'core' }),
        createCapability({ id: 'src2', source: 'component' }),
      ]);

      const stats = getStats();
      expect(stats.bySource.core).toBe(1);
      expect(stats.bySource.component).toBe(1);
    });

    it('tracks capability counts by complexity', () => {
      registerCapabilities([
        createCapability({ id: 'cmp1', complexity: 'simple' }),
        createCapability({ id: 'cmp2', complexity: 'analysis' }),
      ]);

      const stats = getStats();
      expect(stats.byComplexity.simple).toBe(1);
      expect(stats.byComplexity.analysis).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent registrations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(registerCapability(createCapability({ id: `concurrent_${i}` })))
      );

      await Promise.all(promises);
      expect(getStats().total).toBe(10);
    });

    it('handles concurrent executions', async () => {
      registerCapabilities(
        Array.from({ length: 5 }, (_, i) =>
          createCapability({
            id: `exec_concurrent_${i}`,
            handler: async () => ({ success: true }),
          })
        )
      );

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          executeCapability(`exec_concurrent_${i}`, {})
        )
      );

      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});
