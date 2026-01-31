/**
 * Tab Capability Provider
 *
 * Converts TAB_REGISTRY entries to unified capabilities
 */

import type { Capability, TabCapability, AppMode, SubtabDefinition } from '../types';
import { registerCapabilities } from '../registry';

// Import from existing tab registry
import { TAB_REGISTRY, navigateToTab } from '../../tabNavigationRegistry';

/**
 * Convert a tab definition to a capability
 */
function tabToCapability(tab: {
  id: string;
  sectorMode: string;
  tabKey: string;
  tabLabel: string;
  aliases?: string[];
  subtabs?: SubtabDefinition[];
}): TabCapability {
  const sectorMode = tab.sectorMode as AppMode;

  return {
    id: `tab_${tab.id}`,
    kind: 'tab',
    description: `Navigate to ${tab.tabLabel} tab in ${sectorMode}`,
    source: 'tab',
    complexity: 'navigation',
    priority: 60,
    sectors: [sectorMode],
    executionPath: 'direct',
    tabKey: tab.tabKey,
    tabLabel: tab.tabLabel,
    sectorMode,
    subtabs: tab.subtabs,
    aliases: [
      tab.tabLabel.toLowerCase(),
      tab.tabKey.toLowerCase(),
      ...(tab.aliases || []),
    ],
    examples: [
      `go to ${tab.tabLabel}`,
      `open ${tab.tabLabel}`,
      `switch to ${tab.tabLabel}`,
    ],
    handler: async () => {
      const result = await navigateToTab(tab.tabLabel);
      return {
        success: result.success,
        message: result.success
          ? `Navigated to ${tab.tabLabel}`
          : result.error || 'Navigation failed',
        data: result,
      };
    },
  };
}

/**
 * Convert subtabs to capabilities
 */
function subtabsToCapabilities(
  parentTab: {
    id: string;
    sectorMode: string;
    tabKey: string;
    tabLabel: string;
    subtabs?: SubtabDefinition[];
  }
): Capability[] {
  if (!parentTab.subtabs) return [];

  return parentTab.subtabs.map((subtab) => ({
    id: `tab_${parentTab.id}_${subtab.id}`,
    kind: 'tab' as const,
    description: `Navigate to ${subtab.label} subtab in ${parentTab.tabLabel}`,
    source: 'tab' as const,
    complexity: 'navigation' as const,
    priority: 55,
    sectors: [parentTab.sectorMode as AppMode],
    executionPath: 'direct' as const,
    tabKey: subtab.key,
    aliases: [
      subtab.label.toLowerCase(),
      subtab.key.toLowerCase(),
      ...(subtab.aliases || []),
    ],
    examples: [
      `go to ${subtab.label}`,
      `open ${subtab.label} in ${parentTab.tabLabel}`,
    ],
    handler: async () => {
      const result = await navigateToTab(`${parentTab.tabLabel} ${subtab.label}`);
      return {
        success: result.success,
        message: result.success
          ? `Navigated to ${subtab.label}`
          : result.error || 'Navigation failed',
        data: result,
      };
    },
  }));
}

/**
 * Load all tabs as capabilities
 */
export function loadTabCapabilities(): void {
  const capabilities: Capability[] = [];

  for (const tab of TAB_REGISTRY) {
    // Add main tab capability
    capabilities.push(tabToCapability(tab));

    // Add subtab capabilities
    capabilities.push(...subtabsToCapabilities(tab));
  }

  registerCapabilities(capabilities);
  console.log(`[CapabilityRegistry] Loaded ${capabilities.length} tab capabilities`);
}

/**
 * Get tab capability count
 */
export function getTabCapabilityCount(): number {
  let count = TAB_REGISTRY.length;
  for (const tab of TAB_REGISTRY) {
    count += tab.subtabs?.length || 0;
  }
  return count;
}
