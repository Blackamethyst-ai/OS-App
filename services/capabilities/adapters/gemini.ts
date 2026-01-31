/**
 * Gemini Adapter
 *
 * Provides Gemini-specific interface to the capability registry
 * for function calling / tool use
 */

import type { FunctionDeclaration, Schema, Type } from '@google/genai';
import type {
  Capability,
  AppMode,
  CapabilitySchema,
  GeminiToolManifest,
} from '../types';
import {
  getAllCapabilities,
  getCapabilitiesForSector,
  getCapability,
  executeCapability,
} from '../registry';

// ============================================================================
// Schema Conversion
// ============================================================================

/**
 * Convert capability schema to Gemini schema format
 */
function convertSchemaToGemini(schema: CapabilitySchema): Schema {
  const geminiSchema: Schema = {
    type: schema.type.toUpperCase() as Type,
  };

  if (schema.description) {
    geminiSchema.description = schema.description;
  }

  if (schema.properties) {
    geminiSchema.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      geminiSchema.properties[key] = convertSchemaToGemini(value);
    }
  }

  if (schema.required && schema.required.length > 0) {
    geminiSchema.required = schema.required;
  }

  if (schema.items) {
    geminiSchema.items = convertSchemaToGemini(schema.items);
  }

  if (schema.enum) {
    geminiSchema.enum = schema.enum;
  }

  return geminiSchema;
}

/**
 * Convert a capability to a Gemini function declaration
 */
function capabilityToFunctionDeclaration(capability: Capability): FunctionDeclaration {
  const declaration: FunctionDeclaration = {
    name: capability.id,
    description: capability.description,
  };

  if (capability.schema) {
    declaration.parameters = convertSchemaToGemini(capability.schema);
  }

  return declaration;
}

// ============================================================================
// Manifest Generation
// ============================================================================

/**
 * Get all capabilities as Gemini function declarations
 */
export function getGeminiFunctionDeclarations(options?: {
  sector?: AppMode;
  includeAll?: boolean;
}): FunctionDeclaration[] {
  const capabilities = options?.sector
    ? getCapabilitiesForSector(options.sector)
    : getAllCapabilities();

  // Filter to only capabilities with schemas (for function calling)
  const filtered = options?.includeAll
    ? capabilities
    : capabilities.filter((c) => c.schema);

  return filtered.map(capabilityToFunctionDeclaration);
}

/**
 * Get Gemini tool manifest for a sector
 */
export function getGeminiToolManifest(sector?: AppMode): GeminiToolManifest {
  return {
    functionDeclarations: getGeminiFunctionDeclarations({ sector }),
  };
}

// ============================================================================
// Function Call Handling
// ============================================================================

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiFunctionResult {
  name: string;
  response: {
    success: boolean;
    result?: unknown;
    error?: string;
  };
}

/**
 * Execute a Gemini function call
 */
export async function executeGeminiFunctionCall(
  call: GeminiFunctionCall
): Promise<GeminiFunctionResult> {
  const result = await executeCapability(call.name, call.args);

  return {
    name: call.name,
    response: {
      success: result.success,
      result: result.result,
      error: result.error,
    },
  };
}

/**
 * Execute multiple Gemini function calls in parallel
 */
export async function executeGeminiFunctionCalls(
  calls: GeminiFunctionCall[]
): Promise<GeminiFunctionResult[]> {
  return Promise.all(calls.map(executeGeminiFunctionCall));
}

// ============================================================================
// Context Generation
// ============================================================================

/**
 * Generate system prompt context for Gemini
 */
export function generateGeminiContext(sector?: AppMode): string {
  const capabilities = sector
    ? getCapabilitiesForSector(sector)
    : getAllCapabilities();

  const lines: string[] = [
    'You have access to the following tools:',
    '',
  ];

  // Group by category
  const byCategory: Record<string, Capability[]> = {};
  for (const cap of capabilities.filter((c) => c.schema)) {
    const category = cap.category || 'general';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(cap);
  }

  for (const [category, caps] of Object.entries(byCategory)) {
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    for (const cap of caps.slice(0, 10)) {
      lines.push(`- **${cap.id}**: ${cap.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get tool use instructions for Gemini
 */
export function getToolUseInstructions(sector?: AppMode): string {
  const capabilities = sector
    ? getCapabilitiesForSector(sector)
    : getAllCapabilities();

  const toolCount = capabilities.filter((c) => c.schema).length;

  return `You have access to ${toolCount} tools. Use them to help the user accomplish their goals.

When using tools:
1. Choose the most appropriate tool for the task
2. Provide all required parameters
3. Explain what you're doing if the action is significant

Available tool categories:
${[...new Set(capabilities.map((c) => c.category || 'general'))].join(', ')}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a function call matches a capability's schema
 */
export function validateFunctionCall(call: GeminiFunctionCall): {
  valid: boolean;
  errors: string[];
} {
  const capability = getCapability(call.name);

  if (!capability) {
    return { valid: false, errors: [`Unknown function: ${call.name}`] };
  }

  if (!capability.schema) {
    // No schema means no validation needed
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  // Check required properties
  if (capability.schema.required) {
    for (const required of capability.schema.required) {
      if (!(required in call.args)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
  }

  // Check property types (basic validation)
  if (capability.schema.properties) {
    for (const [key, value] of Object.entries(call.args)) {
      const propSchema = capability.schema.properties[key];
      if (propSchema) {
        const expectedType = propSchema.type;
        const actualType = typeof value;

        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Parameter ${key} should be an array`);
        } else if (expectedType !== 'array' && expectedType !== actualType) {
          // Allow some type coercion
          if (!(expectedType === 'number' && actualType === 'string' && !isNaN(Number(value)))) {
            errors.push(`Parameter ${key} should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
