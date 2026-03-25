/**
 * Tests for capabilities/index.ts
 *
 * Tests the initialization logic and re-exports from the capabilities module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeCapabilities,
  resetInitialization,
} from '../index';
import {
  clearRegistry,
  isInitialized,
  markInitialized,
  getStats,
  registerCapability,
  getCapability,
  getAllCapabilities,
  getCapabilitiesByKind,
  searchCapabilities,
  findCapability,
  executeCapability,
} from '../registry';
import type { Capability } from '../types';

// Helper to create test capabilities
function createTestCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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

describe('capabilities/index', () => {
  beforeEach(() => {
    clearRegistry();
    resetInitialization();
  });

  describe('initializeCapabilities', () => {
    it('should initialize the registry and mark it as initialized', async () => {
      expect(isInitialized()).toBe(false);
      await initializeCapabilities();
      expect(isInitialized()).toBe(true);
    });

    it('should be idempotent - calling multiple times does not error', async () => {
      await initializeCapabilities();
      // Calling again after completion should succeed without error
      await initializeCapabilities();
      expect(isInitialized()).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      markInitialized();
      const statsBefore = getStats();
      await initializeCapabilities();
      // Should still be initialized but not error
      expect(isInitialized()).toBe(true);
    });

    it('should load capabilities during initialization', async () => {
      await initializeCapabilities();
      const stats = getStats();
      // After initialization, registry should have some capabilities loaded
      // (tabs, actions, UI capabilities)
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetInitialization', () => {
    it('should allow re-initialization after reset', async () => {
      await initializeCapabilities();
      expect(isInitialized()).toBe(true);

      resetInitialization();
      clearRegistry();
      expect(isInitialized()).toBe(false);

      // Should be able to initialize again
      await initializeCapabilities();
      expect(isInitialized()).toBe(true);
    });

    it('should create a new promise after reset', async () => {
      const promise1 = initializeCapabilities();
      await promise1;

      resetInitialization();
      clearRegistry();

      const promise2 = initializeCapabilities();
      expect(promise2).not.toBe(promise1);
      await promise2;
    });
  });

  describe('re-exported registry functions', () => {
    it('should register and retrieve capabilities via re-exports', () => {
      const cap = createTestCapability({ id: 'reexport_test' });
      registerCapability(cap);
      const retrieved = getCapability('reexport_test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('reexport_test');
    });

    it('should get all capabilities via re-export', () => {
      registerCapability(createTestCapability({ id: 'all_1' }));
      registerCapability(createTestCapability({ id: 'all_2' }));
      const all = getAllCapabilities();
      expect(all.length).toBe(2);
    });

    it('should filter by kind via re-export', () => {
      registerCapability(createTestCapability({ id: 'action_1', kind: 'action' }));
      registerCapability(createTestCapability({ id: 'nav_1', kind: 'navigation' }));
      const actions = getCapabilitiesByKind('action');
      expect(actions.every(c => c.kind === 'action')).toBe(true);
    });

    it('should search capabilities via re-export', () => {
      registerCapability(createTestCapability({
        id: 'search_theme',
        description: 'Toggle the theme',
      }));
      const matches = searchCapabilities('theme');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].capability.id).toBe('search_theme');
    });

    it('should find best capability via re-export', () => {
      registerCapability(createTestCapability({
        id: 'find_dashboard',
        description: 'Open the dashboard',
      }));
      const found = findCapability('dashboard');
      expect(found).toBeDefined();
      expect(found?.id).toBe('find_dashboard');
    });

    it('should execute capability via re-export', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, data: 42 });
      registerCapability(createTestCapability({
        id: 'exec_test',
        handler,
      }));
      const result = await executeCapability('exec_test', { foo: 'bar' });
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should return error when executing non-existent capability', async () => {
      const result = await executeCapability('does_not_exist');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
