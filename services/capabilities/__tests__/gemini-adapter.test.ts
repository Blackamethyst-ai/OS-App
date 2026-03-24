/**
 * Gemini Adapter Tests
 *
 * Tests for Gemini function declarations, execution, validation,
 * and context generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeGeminiFunctionCall,
  executeGeminiFunctionCalls,
  generateGeminiContext,
  getGeminiFunctionDeclarations,
  getGeminiToolManifest,
  getToolUseInstructions,
  validateFunctionCall,
} from '../adapters/gemini';
import {
  registerCapability,
  registerCapabilities,
  clearRegistry,
} from '../registry';
import type { Capability } from '../types';

function createCap(overrides: Partial<Capability> = {}): Capability {
  return {
    id: 'test_cap',
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

describe('GeminiAdapter', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('executeGeminiFunctionCall', () => {
    it('should execute a registered capability and return result', async () => {
      registerCapability(
        createCap({
          id: 'gemini_action',
          handler: async (args) => ({ success: true, data: args.input }),
        })
      );

      const result = await executeGeminiFunctionCall({
        name: 'gemini_action',
        args: { input: 'test' },
      });

      expect(result.name).toBe('gemini_action');
      expect(result.response.success).toBe(true);
    });

    it('should return error for non-existent capability', async () => {
      const result = await executeGeminiFunctionCall({
        name: 'nonexistent',
        args: {},
      });

      expect(result.name).toBe('nonexistent');
      expect(result.response.success).toBe(false);
      expect(result.response.error).toContain('not found');
    });
  });

  describe('executeGeminiFunctionCalls', () => {
    it('should execute multiple calls in parallel', async () => {
      registerCapabilities([
        createCap({
          id: 'parallel_a',
          handler: async () => ({ success: true, data: 'a' }),
        }),
        createCap({
          id: 'parallel_b',
          handler: async () => ({ success: true, data: 'b' }),
        }),
      ]);

      const results = await executeGeminiFunctionCalls([
        { name: 'parallel_a', args: {} },
        { name: 'parallel_b', args: {} },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].response.success).toBe(true);
      expect(results[1].response.success).toBe(true);
    });

    it('should handle mix of success and failure', async () => {
      registerCapability(
        createCap({
          id: 'exists',
          handler: async () => ({ success: true }),
        })
      );

      const results = await executeGeminiFunctionCalls([
        { name: 'exists', args: {} },
        { name: 'missing', args: {} },
      ]);

      expect(results[0].response.success).toBe(true);
      expect(results[1].response.success).toBe(false);
    });
  });

  describe('validateFunctionCall', () => {
    it('should validate a correct function call', () => {
      registerCapability(
        createCap({
          id: 'validated',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['name'],
          },
        })
      );

      const result = validateFunctionCall({
        name: 'validated',
        args: { name: 'test', count: 5 },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required parameters', () => {
      registerCapability(
        createCap({
          id: 'require_check',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        })
      );

      const result = validateFunctionCall({
        name: 'require_check',
        args: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: name');
    });

    it('should report type mismatches', () => {
      registerCapability(
        createCap({
          id: 'type_check',
          schema: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        })
      );

      const result = validateFunctionCall({
        name: 'type_check',
        args: { count: 'not_a_number' },
      });

      // The string 'not_a_number' is not coercible to number, so should fail
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('count'))).toBe(true);
    });

    it('should allow coercion of numeric strings', () => {
      registerCapability(
        createCap({
          id: 'coerce_check',
          schema: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        })
      );

      const result = validateFunctionCall({
        name: 'coerce_check',
        args: { count: '42' },
      });

      expect(result.valid).toBe(true);
    });

    it('should validate array type', () => {
      registerCapability(
        createCap({
          id: 'array_check',
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array' },
            },
          },
        })
      );

      // Passing non-array
      const result = validateFunctionCall({
        name: 'array_check',
        args: { items: 'not_array' },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('array'))).toBe(true);
    });

    it('should accept valid array', () => {
      registerCapability(
        createCap({
          id: 'array_ok',
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array' },
            },
          },
        })
      );

      const result = validateFunctionCall({
        name: 'array_ok',
        args: { items: [1, 2, 3] },
      });

      expect(result.valid).toBe(true);
    });

    it('should return error for unknown function', () => {
      const result = validateFunctionCall({
        name: 'unknown_function',
        args: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown function: unknown_function');
    });

    it('should pass validation when no schema defined', () => {
      registerCapability(createCap({ id: 'no_schema' }));

      const result = validateFunctionCall({
        name: 'no_schema',
        args: { anything: 'goes' },
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('generateGeminiContext', () => {
    it('should generate context string with tool descriptions', () => {
      registerCapability(
        createCap({
          id: 'context_tool',
          description: 'A useful tool',
          category: 'analyze',
          schema: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        })
      );

      const context = generateGeminiContext();
      expect(context).toContain('You have access to the following tools');
      expect(context).toContain('context_tool');
      expect(context).toContain('A useful tool');
    });

    it('should group capabilities by category', () => {
      registerCapabilities([
        createCap({
          id: 'ui_tool',
          category: 'ui',
          schema: { type: 'object' },
        }),
        createCap({
          id: 'nav_tool',
          category: 'navigate',
          schema: { type: 'object' },
        }),
      ]);

      const context = generateGeminiContext();
      expect(context).toContain('Ui');
      expect(context).toContain('Navigate');
    });

    it('should only include capabilities with schemas', () => {
      registerCapabilities([
        createCap({ id: 'with_schema', schema: { type: 'object' } }),
        createCap({ id: 'no_schema' }),
      ]);

      const context = generateGeminiContext();
      expect(context).toContain('with_schema');
      expect(context).not.toContain('no_schema');
    });
  });

  describe('getToolUseInstructions', () => {
    it('should include tool count', () => {
      registerCapabilities([
        createCap({ id: 'tool_1', schema: { type: 'object' } }),
        createCap({ id: 'tool_2', schema: { type: 'object' } }),
      ]);

      const instructions = getToolUseInstructions();
      expect(instructions).toContain('2 tools');
    });

    it('should include category names', () => {
      registerCapability(
        createCap({
          id: 'cat_tool',
          category: 'analyze',
          schema: { type: 'object' },
        })
      );

      const instructions = getToolUseInstructions();
      expect(instructions).toContain('analyze');
    });

    it('should default to general category when none specified', () => {
      registerCapability(createCap({ id: 'general_tool' }));

      const instructions = getToolUseInstructions();
      expect(instructions).toContain('general');
    });
  });

  describe('getGeminiFunctionDeclarations', () => {
    it('should return declarations for capabilities with schemas', () => {
      registerCapabilities([
        createCap({
          id: 'decl_with_schema',
          description: 'Has schema',
          schema: {
            type: 'object',
            properties: { input: { type: 'string' } },
          },
        }),
        createCap({ id: 'decl_no_schema', description: 'No schema' }),
      ]);

      const declarations = getGeminiFunctionDeclarations();
      expect(declarations).toHaveLength(1);
      expect(declarations[0].name).toBe('decl_with_schema');
      expect(declarations[0].description).toBe('Has schema');
    });

    it('should include all capabilities when includeAll is true', () => {
      registerCapabilities([
        createCap({
          id: 'all_with',
          schema: { type: 'object' },
        }),
        createCap({ id: 'all_without' }),
      ]);

      const declarations = getGeminiFunctionDeclarations({ includeAll: true });
      expect(declarations).toHaveLength(2);
    });

    it('should convert schema with description', () => {
      registerCapability(
        createCap({
          id: 'desc_schema',
          schema: {
            type: 'object',
            description: 'A described schema',
            properties: {
              name: { type: 'string', description: 'The name' },
            },
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      expect(declarations[0].parameters).toBeDefined();
      // The description should be passed through convertSchemaToGemini
      expect(declarations[0].parameters?.description).toBe('A described schema');
    });

    it('should convert schema with required fields', () => {
      registerCapability(
        createCap({
          id: 'req_schema',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
            required: ['name'],
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      expect(declarations[0].parameters?.required).toEqual(['name']);
    });

    it('should convert schema with nested properties recursively', () => {
      registerCapability(
        createCap({
          id: 'nested_schema',
          schema: {
            type: 'object',
            properties: {
              config: {
                type: 'object',
                properties: {
                  theme: { type: 'string' },
                  size: { type: 'number' },
                },
              },
            },
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      const params = declarations[0].parameters;
      expect(params?.properties?.config).toBeDefined();
      expect(params?.properties?.config?.properties?.theme).toBeDefined();
    });

    it('should convert schema with items (array type)', () => {
      registerCapability(
        createCap({
          id: 'items_schema',
          schema: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      const tagsSchema = declarations[0].parameters?.properties?.tags;
      expect(tagsSchema?.items).toBeDefined();
    });

    it('should convert schema with enum values', () => {
      registerCapability(
        createCap({
          id: 'enum_schema',
          schema: {
            type: 'object',
            properties: {
              color: {
                type: 'string',
                enum: ['red', 'green', 'blue'],
              },
            },
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      const colorSchema = declarations[0].parameters?.properties?.color;
      expect(colorSchema?.enum).toEqual(['red', 'green', 'blue']);
    });

    it('should convert schema with empty required array (no required field set)', () => {
      registerCapability(
        createCap({
          id: 'empty_req',
          schema: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: [],
          },
        })
      );

      const declarations = getGeminiFunctionDeclarations();
      // Empty required array should not be included
      expect(declarations[0].parameters?.required).toBeUndefined();
    });

    it('should handle capability without schema (no parameters)', () => {
      registerCapability(
        createCap({
          id: 'no_params',
          schema: undefined,
        })
      );

      // includeAll to get the capability even without schema
      const declarations = getGeminiFunctionDeclarations({ includeAll: true });
      expect(declarations[0].parameters).toBeUndefined();
    });
  });

  describe('getGeminiToolManifest', () => {
    it('should return manifest with functionDeclarations array', () => {
      registerCapability(
        createCap({
          id: 'manifest_tool',
          schema: { type: 'object' },
        })
      );

      const manifest = getGeminiToolManifest();
      expect(manifest.functionDeclarations).toBeDefined();
      expect(manifest.functionDeclarations).toHaveLength(1);
      expect(manifest.functionDeclarations[0].name).toBe('manifest_tool');
    });

    it('should return empty declarations when no capabilities with schemas', () => {
      registerCapability(createCap({ id: 'no_schema_manifest' }));

      const manifest = getGeminiToolManifest();
      expect(manifest.functionDeclarations).toHaveLength(0);
    });

    it('should accept sector parameter and return declarations', () => {
      registerCapability(
        createCap({
          id: 'dash_manifest',
          sectors: ['DASHBOARD' as any],
          schema: { type: 'object' },
          priority: 80,
        })
      );

      const manifest = getGeminiToolManifest('DASHBOARD' as any);
      const names = manifest.functionDeclarations.map((d) => d.name);
      expect(names).toContain('dash_manifest');
    });
  });

  describe('generateGeminiContext with sector', () => {
    it('should generate context for a specific sector', () => {
      registerCapability(
        createCap({
          id: 'sector_context',
          sectors: ['DASHBOARD' as any],
          category: 'ui',
          schema: { type: 'object' },
        })
      );

      const context = generateGeminiContext('DASHBOARD' as any);
      expect(context).toContain('sector_context');
    });
  });

  describe('getToolUseInstructions with sector', () => {
    it('should generate instructions for a specific sector', () => {
      registerCapability(
        createCap({
          id: 'sector_instr',
          sectors: ['DASHBOARD' as any],
          schema: { type: 'object' },
        })
      );

      const instructions = getToolUseInstructions('DASHBOARD' as any);
      expect(instructions).toContain('1 tools');
    });
  });
});
