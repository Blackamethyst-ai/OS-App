/**
 * Dynamic Tool Capability Provider
 *
 * Integrates with DynamicToolRegistry for runtime-registered tools
 */

import type { Capability, CapabilityResult } from '../types';
import { registerCapability, unregisterCapability, getCapability } from '../registry';
import { logger } from '../../logger';

// Track dynamic capabilities for cleanup
const dynamicCapabilityIds = new Set<string>();

/**
 * Register a dynamic tool as a capability
 */
export function registerDynamicCapability(
  id: string,
  description: string,
  handler: (args: Record<string, unknown>) => Promise<CapabilityResult>,
  options?: {
    priority?: number;
    sectors?: string[];
    schema?: Record<string, unknown>;
  }
): void {
  const capability: Capability = {
    id: `dynamic_${id}`,
    kind: 'tool',
    description,
    source: 'dynamic',
    complexity: 'analysis', // Dynamic tools are typically more complex
    priority: options?.priority || 40,
    sectors: (options?.sectors || []) as any[],
    executionPath: 'auto',
    handler,
    schema: options?.schema as any,
  };

  registerCapability(capability);
  dynamicCapabilityIds.add(capability.id);
  logger.debug(`Registered dynamic capability: ${capability.id}`, undefined, 'DynamicProvider');
}

/**
 * Unregister a dynamic capability
 */
export function unregisterDynamicCapability(id: string): boolean {
  const fullId = id.startsWith('dynamic_') ? id : `dynamic_${id}`;
  const result = unregisterCapability(fullId);
  if (result) {
    dynamicCapabilityIds.delete(fullId);
    logger.debug(`Unregistered dynamic capability: ${fullId}`, undefined, 'DynamicProvider');
  }
  return result;
}

/**
 * Get all dynamic capability IDs
 */
export function getDynamicCapabilityIds(): string[] {
  return Array.from(dynamicCapabilityIds);
}

/**
 * Clear all dynamic capabilities
 */
export function clearDynamicCapabilities(): void {
  for (const id of dynamicCapabilityIds) {
    unregisterCapability(id);
  }
  dynamicCapabilityIds.clear();
  logger.debug('Cleared all dynamic capabilities', undefined, 'DynamicProvider');
}

/**
 * Check if a dynamic capability exists
 */
export function hasDynamicCapability(id: string): boolean {
  const fullId = id.startsWith('dynamic_') ? id : `dynamic_${id}`;
  return getCapability(fullId) !== undefined;
}

/**
 * Sync with DynamicToolRegistry
 * Call this after DynamicToolRegistry loads tools from persistence
 */
export async function syncFromDynamicToolRegistry(): Promise<void> {
  try {
    // Import dynamically to avoid circular dependencies
    const { dynamicRegistry } = await import('../../DynamicToolRegistry');

    // Get all dynamic tools from the registry
    const manifests = dynamicRegistry.getCombinedManifests();

    // Register each as a capability
    for (const manifest of manifests) {
      if (!getCapability(`dynamic_${manifest.name}`)) {
        registerDynamicCapability(
          manifest.name ?? '',
          manifest.description || `Dynamic tool: ${manifest.name}`,
          async (args) => {
            const result = await dynamicRegistry.execute(manifest.name ?? '', args);
            return {
              success: result.success !== false,
              data: result,
            };
          },
          {
            schema: manifest.parameters as any,
          }
        );
      }
    }

    logger.debug(`Synced ${manifests.length} tools from DynamicToolRegistry`, undefined, 'DynamicProvider');
  } catch (error) {
    logger.warn('Failed to sync from DynamicToolRegistry', error, 'DynamicProvider');
  }
}
