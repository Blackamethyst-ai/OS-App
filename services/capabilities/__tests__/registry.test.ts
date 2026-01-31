import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCapability,
  registerCapabilities,
  unregisterCapability,
  getCapability,
  getAllCapabilities,
  getCapabilities,
  getCapabilitiesByKind,
  getCapabilitiesForSector,
  searchCapabilities,
  findCapability,
  executeCapability,
  routeQuery,
  getStats,
  clearRegistry,
  isInitialized,
  markInitialized,
  getRegistryInfo,
} from '../registry';
import type { Capability, AppMode } from '../types';

// Helper to create test capabilities
function createTestCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: `test_${Date.now()}_${Math.random()}`,
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

describe('CapabilityRegistry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('Registration', () => {
    it('should register a capability', () => {
      const cap = createTestCapability({ id: 'test_cap' });
      registerCapability(cap);

      const retrieved = getCapability('test_cap');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test_cap');
    });

    it('should register multiple capabilities', () => {
      const caps = [
        createTestCapability({ id: 'cap_1' }),
        createTestCapability({ id: 'cap_2' }),
        createTestCapability({ id: 'cap_3' }),
      ];
      registerCapabilities(caps);

      expect(getAllCapabilities().length).toBe(3);
    });

    it('should unregister a capability', () => {
      const cap = createTestCapability({ id: 'to_remove' });
      registerCapability(cap);
      expect(getCapability('to_remove')).toBeDefined();

      const result = unregisterCapability('to_remove');
      expect(result).toBe(true);
      expect(getCapability('to_remove')).toBeUndefined();
    });

    it('should return false when unregistering non-existent capability', () => {
      const result = unregisterCapability('does_not_exist');
      expect(result).toBe(false);
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      registerCapabilities([
        createTestCapability({ id: 'action_1', kind: 'action', complexity: 'simple' }),
        createTestCapability({ id: 'action_2', kind: 'action', complexity: 'analysis' }),
        createTestCapability({ id: 'tab_1', kind: 'tab', source: 'tab' }),
        createTestCapability({ id: 'nav_1', kind: 'navigation', priority: 80 }),
      ]);
    });

    it('should get all capabilities', () => {
      const all = getAllCapabilities();
      expect(all.length).toBe(4);
    });

    it('should filter by kind', () => {
      const actions = getCapabilitiesByKind('action');
      expect(actions.length).toBe(2);
      expect(actions.every((c) => c.kind === 'action')).toBe(true);
    });

    it('should filter by options', () => {
      const filtered = getCapabilities({ kind: 'action', complexity: 'simple' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('action_1');
    });

    it('should sort by priority', () => {
      const sorted = getCapabilities({});
      expect(sorted[0].priority).toBeGreaterThanOrEqual(sorted[1].priority);
    });

    it('should apply limit', () => {
      const limited = getCapabilities({ limit: 2 });
      expect(limited.length).toBe(2);
    });
  });

  describe('Sector Filtering', () => {
    beforeEach(() => {
      registerCapabilities([
        createTestCapability({ id: 'global', sectors: [] }),
        createTestCapability({ id: 'dashboard', sectors: ['DASHBOARD' as AppMode] }),
        createTestCapability({ id: 'nexus', sectors: ['NEXUS' as AppMode] }),
      ]);
    });

    it('should include global capabilities for any sector', () => {
      const caps = getCapabilitiesForSector('DASHBOARD');
      expect(caps.some((c) => c.id === 'global')).toBe(true);
    });

    it('should include sector-specific capabilities', () => {
      const caps = getCapabilitiesForSector('DASHBOARD');
      expect(caps.some((c) => c.id === 'dashboard')).toBe(true);
    });

    it('should score sector-specific higher than global', () => {
      const caps = getCapabilitiesForSector('DASHBOARD');
      const dashboardCap = caps.find((c) => c.id === 'dashboard');
      const globalCap = caps.find((c) => c.id === 'global');

      // Dashboard-specific should come before global due to sector bonus
      const dashboardIndex = caps.indexOf(dashboardCap!);
      const globalIndex = caps.indexOf(globalCap!);
      expect(dashboardIndex).toBeLessThan(globalIndex);
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      registerCapabilities([
        createTestCapability({
          id: 'open_dashboard',
          description: 'Open the main dashboard',
          aliases: ['go home', 'show dashboard'],
          examples: ['open dashboard', 'show home'],
        }),
        createTestCapability({
          id: 'search_files',
          description: 'Search for files',
          examples: ['find files', 'search documents'],
        }),
      ]);
    });

    it('should find by ID', () => {
      const matches = searchCapabilities('open_dashboard');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].capability.id).toBe('open_dashboard');
      expect(matches[0].matchedOn).toBe('id');
    });

    it('should find by alias', () => {
      const matches = searchCapabilities('go home');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].capability.id).toBe('open_dashboard');
      expect(matches[0].matchedOn).toBe('alias');
    });

    it('should find by description', () => {
      const matches = searchCapabilities('main dashboard');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchedOn).toBe('description');
    });

    it('should find by example', () => {
      const matches = searchCapabilities('find files');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchedOn).toBe('example');
    });

    it('findCapability should return best match', () => {
      const cap = findCapability('dashboard');
      expect(cap).toBeDefined();
      expect(cap?.id).toBe('open_dashboard');
    });
  });

  describe('Execution', () => {
    it('should execute a capability', async () => {
      const cap = createTestCapability({
        id: 'executable',
        handler: async (args) => ({
          success: true,
          data: args,
        }),
      });
      registerCapability(cap);

      const result = await executeCapability('executable', { test: 'value' });
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ success: true, data: { test: 'value' } });
    });

    it('should handle execution errors', async () => {
      const cap = createTestCapability({
        id: 'failing',
        handler: async () => {
          throw new Error('Test error');
        },
      });
      registerCapability(cap);

      const result = await executeCapability('failing');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });

    it('should return error for non-existent capability', async () => {
      const result = await executeCapability('non_existent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should track timing', async () => {
      const cap = createTestCapability({
        id: 'timed',
        handler: async () => ({ success: true }),
      });
      registerCapability(cap);

      const result = await executeCapability('timed');
      expect(result.timing).toBeDefined();
      expect(typeof result.timing).toBe('number');
    });
  });

  describe('Routing', () => {
    beforeEach(() => {
      registerCapabilities([
        createTestCapability({ id: 'simple_action', complexity: 'simple', executionPath: 'direct' }),
        createTestCapability({ id: 'complex_action', complexity: 'architecture', executionPath: 'hybrid' }),
      ]);
    });

    it('should route to matching capability', () => {
      const result = routeQuery('simple_action');
      expect(result.capability).toBeDefined();
      expect(result.path).toBe('direct');
    });

    it('should return auto path when no match', () => {
      const result = routeQuery('unknown_query');
      expect(result.capability).toBeUndefined();
      expect(result.path).toBe('auto');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      registerCapabilities([
        createTestCapability({ kind: 'action', source: 'core', complexity: 'simple' }),
        createTestCapability({ kind: 'action', source: 'voice', complexity: 'analysis' }),
        createTestCapability({ kind: 'tab', source: 'tab', complexity: 'navigation' }),
      ]);
    });

    it('should calculate total count', () => {
      const stats = getStats();
      expect(stats.total).toBe(3);
    });

    it('should count by kind', () => {
      const stats = getStats();
      expect(stats.byKind.action).toBe(2);
      expect(stats.byKind.tab).toBe(1);
    });

    it('should count by source', () => {
      const stats = getStats();
      expect(stats.bySource.core).toBe(1);
      expect(stats.bySource.voice).toBe(1);
      expect(stats.bySource.tab).toBe(1);
    });

    it('should count by complexity', () => {
      const stats = getStats();
      expect(stats.byComplexity.simple).toBe(1);
      expect(stats.byComplexity.analysis).toBe(1);
      expect(stats.byComplexity.navigation).toBe(1);
    });
  });

  describe('Initialization State', () => {
    it('should track initialization status', () => {
      expect(isInitialized()).toBe(false);

      markInitialized();
      expect(isInitialized()).toBe(true);
    });

    it('should provide registry info', () => {
      registerCapability(createTestCapability());

      const info = getRegistryInfo();
      expect(info.count).toBe(1);
      expect(typeof info.lastUpdate).toBe('number');
    });
  });
});
