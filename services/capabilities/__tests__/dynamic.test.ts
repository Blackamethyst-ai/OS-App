/**
 * Dynamic Capability Provider Tests
 *
 * Tests for runtime dynamic tool registration, unregistration,
 * and lifecycle management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerDynamicCapability,
  unregisterDynamicCapability,
  getDynamicCapabilityIds,
  clearDynamicCapabilities,
  hasDynamicCapability,
} from '../providers/dynamic';
import { getCapability, clearRegistry } from '../registry';

describe('DynamicCapabilityProvider', () => {
  beforeEach(() => {
    clearRegistry();
    clearDynamicCapabilities();
  });

  describe('registerDynamicCapability', () => {
    it('should register a dynamic capability with dynamic_ prefix', () => {
      // Arrange
      const handler = async () => ({ success: true });

      // Act
      registerDynamicCapability('my_tool', 'A test tool', handler);

      // Assert
      const cap = getCapability('dynamic_my_tool');
      expect(cap).toBeDefined();
      expect(cap?.id).toBe('dynamic_my_tool');
      expect(cap?.kind).toBe('tool');
      expect(cap?.source).toBe('dynamic');
      expect(cap?.description).toBe('A test tool');
    });

    it('should set default complexity to analysis', () => {
      registerDynamicCapability('analyzer', 'Analyze data', async () => ({ success: true }));

      const cap = getCapability('dynamic_analyzer');
      expect(cap?.complexity).toBe('analysis');
    });

    it('should set default priority to 40', () => {
      registerDynamicCapability('tool', 'A tool', async () => ({ success: true }));

      const cap = getCapability('dynamic_tool');
      expect(cap?.priority).toBe(40);
    });

    it('should accept custom priority', () => {
      registerDynamicCapability('high_pri', 'Important tool', async () => ({ success: true }), {
        priority: 90,
      });

      const cap = getCapability('dynamic_high_pri');
      expect(cap?.priority).toBe(90);
    });

    it('should accept custom sectors', () => {
      registerDynamicCapability('sector_tool', 'Sector tool', async () => ({ success: true }), {
        sectors: ['DASHBOARD', 'CODE_STUDIO'],
      });

      const cap = getCapability('dynamic_sector_tool');
      expect(cap?.sectors).toEqual(['DASHBOARD', 'CODE_STUDIO']);
    });

    it('should accept a schema', () => {
      registerDynamicCapability('schema_tool', 'Schematized', async () => ({ success: true }), {
        schema: {
          type: 'object',
          properties: { input: { type: 'string' } },
          required: ['input'],
        },
      });

      const cap = getCapability('dynamic_schema_tool');
      expect(cap?.schema).toBeDefined();
    });

    it('should track the dynamic capability ID', () => {
      registerDynamicCapability('tracked', 'Tracked tool', async () => ({ success: true }));

      const ids = getDynamicCapabilityIds();
      expect(ids).toContain('dynamic_tracked');
    });

    it('should set executionPath to auto', () => {
      registerDynamicCapability('auto_path', 'Auto path tool', async () => ({ success: true }));

      const cap = getCapability('dynamic_auto_path');
      // executionPath is 'auto' but gets derived via complexityToCPBPath in registerCapability
      // Since complexity is 'analysis', it should map to 'ace'
      expect(cap?.executionPath).toBe('ace');
    });
  });

  describe('unregisterDynamicCapability', () => {
    it('should unregister by raw ID (auto-prefixes dynamic_)', () => {
      registerDynamicCapability('removable', 'To remove', async () => ({ success: true }));
      expect(getCapability('dynamic_removable')).toBeDefined();

      const result = unregisterDynamicCapability('removable');
      expect(result).toBe(true);
      expect(getCapability('dynamic_removable')).toBeUndefined();
    });

    it('should unregister by full ID (already prefixed)', () => {
      registerDynamicCapability('prefixed', 'To remove', async () => ({ success: true }));

      const result = unregisterDynamicCapability('dynamic_prefixed');
      expect(result).toBe(true);
      expect(getCapability('dynamic_prefixed')).toBeUndefined();
    });

    it('should return false when capability does not exist', () => {
      const result = unregisterDynamicCapability('nonexistent');
      expect(result).toBe(false);
    });

    it('should remove from tracked IDs', () => {
      registerDynamicCapability('cleanup', 'Cleanup tool', async () => ({ success: true }));
      expect(getDynamicCapabilityIds()).toContain('dynamic_cleanup');

      unregisterDynamicCapability('cleanup');
      expect(getDynamicCapabilityIds()).not.toContain('dynamic_cleanup');
    });
  });

  describe('getDynamicCapabilityIds', () => {
    it('should return empty array when none registered', () => {
      expect(getDynamicCapabilityIds()).toEqual([]);
    });

    it('should return all registered dynamic capability IDs', () => {
      registerDynamicCapability('a', 'Tool A', async () => ({ success: true }));
      registerDynamicCapability('b', 'Tool B', async () => ({ success: true }));
      registerDynamicCapability('c', 'Tool C', async () => ({ success: true }));

      const ids = getDynamicCapabilityIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('dynamic_a');
      expect(ids).toContain('dynamic_b');
      expect(ids).toContain('dynamic_c');
    });
  });

  describe('clearDynamicCapabilities', () => {
    it('should remove all dynamic capabilities from registry', () => {
      registerDynamicCapability('x', 'Tool X', async () => ({ success: true }));
      registerDynamicCapability('y', 'Tool Y', async () => ({ success: true }));

      clearDynamicCapabilities();

      expect(getDynamicCapabilityIds()).toEqual([]);
      expect(getCapability('dynamic_x')).toBeUndefined();
      expect(getCapability('dynamic_y')).toBeUndefined();
    });
  });

  describe('hasDynamicCapability', () => {
    it('should return true for registered capability by raw ID', () => {
      registerDynamicCapability('exists', 'Exists', async () => ({ success: true }));
      expect(hasDynamicCapability('exists')).toBe(true);
    });

    it('should return true for registered capability by full ID', () => {
      registerDynamicCapability('exists2', 'Exists', async () => ({ success: true }));
      expect(hasDynamicCapability('dynamic_exists2')).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      expect(hasDynamicCapability('nope')).toBe(false);
    });
  });

  describe('handler execution', () => {
    it('should execute the registered handler with args', async () => {
      const handler = async (args: Record<string, unknown>) => ({
        success: true,
        data: args.input,
      });

      registerDynamicCapability('exec_test', 'Executable', handler);

      const cap = getCapability('dynamic_exec_test');
      const result = await cap!.handler({ input: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });
  });

});
