/**
 * Registry Extended Tests
 *
 * Covers edge cases and branches not hit by the existing registry.test.ts:
 * - Gemini manifest caching
 * - getCapabilitiesBySource
 * - Sector filtering with includeGlobal=false
 * - Auto executionPath derivation
 * - Invalid capability validation
 * - getCapabilitiesForSector scoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCapability,
  registerCapabilities,
  getCapability,
  getCapabilities,
  getCapabilitiesBySource,
  getCapabilitiesForSector,
  searchCapabilities,
  executeCapability,
  getGeminiManifests,
  generateVoiceContext,
  clearRegistry,
  getRegistryInfo,
} from '../registry';
import type { Capability, AppMode } from '../types';

function createCap(overrides: Partial<Capability> = {}): Capability {
  return {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    kind: 'action',
    description: 'Test capability',
    source: 'core',
    complexity: 'simple',
    priority: 50,
    sectors: [],
    executionPath: 'direct',
    handler: async () => ({ success: true }),
    ...overrides,
  };
}

describe('Registry Extended', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('Invalid capability registration', () => {
    it('should skip registration when id is missing', () => {
      registerCapability(createCap({ id: '' }));
      expect(getRegistryInfo().count).toBe(0);
    });

    it('should skip registration when description is missing', () => {
      registerCapability(createCap({ description: '' }));
      expect(getRegistryInfo().count).toBe(0);
    });

    it('should skip registration when handler is missing', () => {
      registerCapability(createCap({ handler: undefined as any }));
      expect(getRegistryInfo().count).toBe(0);
    });
  });

  describe('Auto executionPath derivation', () => {
    it('should derive direct path for simple complexity when executionPath is auto', () => {
      registerCapability(createCap({ id: 'auto_simple', complexity: 'simple', executionPath: 'auto' }));
      expect(getCapability('auto_simple')?.executionPath).toBe('direct');
    });

    it('should derive ace path for analysis complexity when executionPath is auto', () => {
      registerCapability(createCap({ id: 'auto_analysis', complexity: 'analysis', executionPath: 'auto' }));
      expect(getCapability('auto_analysis')?.executionPath).toBe('ace');
    });

    it('should derive hybrid path for architecture when executionPath is auto', () => {
      registerCapability(createCap({ id: 'auto_arch', complexity: 'architecture', executionPath: 'auto' }));
      expect(getCapability('auto_arch')?.executionPath).toBe('hybrid');
    });

    it('should derive cascade path for critical when executionPath is auto', () => {
      registerCapability(createCap({ id: 'auto_crit', complexity: 'critical', executionPath: 'auto' }));
      expect(getCapability('auto_crit')?.executionPath).toBe('cascade');
    });

    it('should derive path when executionPath is undefined', () => {
      registerCapability(createCap({
        id: 'no_path',
        complexity: 'analysis',
        executionPath: undefined as any,
      }));
      expect(getCapability('no_path')?.executionPath).toBe('ace');
    });
  });

  describe('getCapabilitiesBySource', () => {
    beforeEach(() => {
      registerCapabilities([
        createCap({ id: 'core_1', source: 'core' }),
        createCap({ id: 'core_2', source: 'core' }),
        createCap({ id: 'tab_1', source: 'tab' }),
        createCap({ id: 'dynamic_1', source: 'dynamic' }),
      ]);
    });

    it('should return capabilities filtered by core source', () => {
      const caps = getCapabilitiesBySource('core');
      expect(caps).toHaveLength(2);
      expect(caps.every((c) => c.source === 'core')).toBe(true);
    });

    it('should return capabilities filtered by tab source', () => {
      const caps = getCapabilitiesBySource('tab');
      expect(caps).toHaveLength(1);
    });

    it('should return empty array for source with no capabilities', () => {
      const caps = getCapabilitiesBySource('voice');
      expect(caps).toHaveLength(0);
    });
  });

  describe('Sector filtering with includeGlobal', () => {
    beforeEach(() => {
      registerCapabilities([
        createCap({ id: 'global_cap', sectors: [] }),
        createCap({ id: 'dash_cap', sectors: ['DASHBOARD' as AppMode] }),
        createCap({ id: 'nexus_cap', sectors: ['NEXUS' as AppMode] }),
      ]);
    });

    it('should include global when includeGlobal is true (default)', () => {
      const caps = getCapabilities({ sector: 'DASHBOARD' });
      expect(caps.some((c) => c.id === 'global_cap')).toBe(true);
      expect(caps.some((c) => c.id === 'dash_cap')).toBe(true);
      expect(caps.some((c) => c.id === 'nexus_cap')).toBe(false);
    });

    it('should exclude global when includeGlobal is false', () => {
      const caps = getCapabilities({ sector: 'DASHBOARD', includeGlobal: false });
      expect(caps.some((c) => c.id === 'global_cap')).toBe(false);
      expect(caps.some((c) => c.id === 'dash_cap')).toBe(true);
    });
  });

  describe('getCapabilitiesForSector scoring', () => {
    it('should filter out capabilities with score <= 0', () => {
      registerCapabilities([
        createCap({ id: 'irrelevant', sectors: ['NEXUS' as AppMode], priority: 10 }),
        createCap({ id: 'relevant', sectors: ['DASHBOARD' as AppMode], priority: 50 }),
      ]);

      const caps = getCapabilitiesForSector('DASHBOARD');
      // irrelevant gets 10 - 20 = -10 score, filtered out
      expect(caps.some((c) => c.id === 'irrelevant')).toBe(false);
      expect(caps.some((c) => c.id === 'relevant')).toBe(true);
    });

    it('should rank sector-specific above global capabilities', () => {
      registerCapabilities([
        createCap({ id: 'global', sectors: [], priority: 50 }),
        createCap({ id: 'specific', sectors: ['DASHBOARD' as AppMode], priority: 50 }),
      ]);

      const caps = getCapabilitiesForSector('DASHBOARD');
      const specificIdx = caps.findIndex((c) => c.id === 'specific');
      const globalIdx = caps.findIndex((c) => c.id === 'global');
      expect(specificIdx).toBeLessThan(globalIdx);
    });
  });

  describe('Search edge cases', () => {
    it('should handle empty query gracefully', () => {
      registerCapability(createCap({ id: 'any_cap' }));
      // Empty query matches everything via includes('')
      const matches = searchCapabilities('');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      registerCapability(createCap({ id: 'MY_CAP', description: 'My Capability' }));
      const matches = searchCapabilities('my_cap');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from query', () => {
      registerCapability(createCap({ id: 'trim_test' }));
      const matches = searchCapabilities('  trim_test  ');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should boost score by priority', () => {
      registerCapabilities([
        createCap({ id: 'low_pri', description: 'Test item', priority: 10 }),
        createCap({ id: 'high_pri', description: 'Test item', priority: 90 }),
      ]);

      const matches = searchCapabilities('test item');
      // High priority should rank first
      expect(matches[0].capability.priority).toBeGreaterThan(matches[1].capability.priority);
    });

    it('should apply search limit', () => {
      for (let i = 0; i < 10; i++) {
        registerCapability(createCap({ id: `search_${i}`, description: `Searchable item ${i}` }));
      }

      const matches = searchCapabilities('searchable', { limit: 3 });
      expect(matches).toHaveLength(3);
    });

    it('should respect kind filter in search', () => {
      registerCapabilities([
        createCap({ id: 'action_search', kind: 'action', description: 'Findable' }),
        createCap({ id: 'tab_search', kind: 'tab', description: 'Findable' }),
      ]);

      const matches = searchCapabilities('findable', { kind: 'action' });
      expect(matches.every((m) => m.capability.kind === 'action')).toBe(true);
    });
  });

  describe('Execution edge cases', () => {
    it('should handle handler returning success: false', async () => {
      registerCapability(
        createCap({
          id: 'soft_fail',
          handler: async () => ({ success: false, error: 'Soft failure' }),
        })
      );

      const result = await executeCapability('soft_fail');
      expect(result.success).toBe(false);
    });

    it('should handle non-Error throw', async () => {
      registerCapability(
        createCap({
          id: 'string_throw',
          handler: async () => {
            throw 'string error';
          },
        })
      );

      const result = await executeCapability('string_throw');
      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should pass empty args by default', async () => {
      let receivedArgs: Record<string, unknown> = {};
      registerCapability(
        createCap({
          id: 'default_args',
          handler: async (args) => {
            receivedArgs = args;
            return { success: true };
          },
        })
      );

      await executeCapability('default_args');
      expect(receivedArgs).toEqual({});
    });
  });

  describe('Gemini manifest caching', () => {
    it('should cache manifests and return same results on second call', () => {
      registerCapability(
        createCap({
          id: 'cached_manifest',
          schema: {
            type: 'object',
            properties: { input: { type: 'string' } },
          },
        })
      );

      const first = getGeminiManifests();
      const second = getGeminiManifests();

      expect(first).toEqual(second);
      expect(first).toHaveLength(1);
    });

    it('should invalidate cache when new capability registered', () => {
      registerCapability(
        createCap({
          id: 'cached_1',
          schema: { type: 'object' },
        })
      );

      const first = getGeminiManifests();
      expect(first).toHaveLength(1);

      registerCapability(
        createCap({
          id: 'cached_2',
          schema: { type: 'object' },
        })
      );

      const second = getGeminiManifests();
      expect(second).toHaveLength(2);
    });

    it('should not cache when sector filter is applied', () => {
      registerCapability(
        createCap({
          id: 'sector_manifest',
          sectors: ['DASHBOARD' as AppMode],
          schema: { type: 'object' },
        })
      );

      const result = getGeminiManifests({ sector: 'DASHBOARD' });
      expect(result).toHaveLength(1);
    });

    it('should exclude capabilities without schemas', () => {
      registerCapabilities([
        createCap({ id: 'with_schema', schema: { type: 'object' } }),
        createCap({ id: 'without_schema' }),
      ]);

      const manifests = getGeminiManifests();
      expect(manifests).toHaveLength(1);
      expect(manifests[0].name).toBe('with_schema');
    });

    it('should include schema properties in manifest', () => {
      registerCapability(
        createCap({
          id: 'full_schema',
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
      expect(manifests[0].parameters).toBeDefined();
      expect(manifests[0].parameters?.properties).toHaveProperty('theme');
      expect(manifests[0].parameters?.required).toContain('theme');
    });
  });

  describe('Voice context generation', () => {
    it('should group capabilities by complexity', () => {
      registerCapabilities([
        createCap({ id: 'simple_vc', complexity: 'simple', sectors: ['DASHBOARD' as AppMode] }),
        createCap({ id: 'nav_vc', complexity: 'navigation', sectors: ['DASHBOARD' as AppMode] }),
        createCap({ id: 'analysis_vc', complexity: 'analysis', sectors: ['DASHBOARD' as AppMode] }),
      ]);

      const context = generateVoiceContext('DASHBOARD');
      expect(context.groupedByComplexity.simple).toContain('simple_vc');
      expect(context.groupedByComplexity.navigation).toContain('nav_vc');
      expect(context.groupedByComplexity.analysis).toContain('analysis_vc');
    });

    it('should include capability descriptions and examples', () => {
      registerCapability(
        createCap({
          id: 'desc_vc',
          description: 'A descriptive capability',
          examples: ['try this'],
          sectors: ['DASHBOARD' as AppMode],
        })
      );

      const context = generateVoiceContext('DASHBOARD');
      const cap = context.capabilities.find((c) => c.id === 'desc_vc');
      expect(cap?.description).toBe('A descriptive capability');
      expect(cap?.examples).toContain('try this');
    });
  });
});
