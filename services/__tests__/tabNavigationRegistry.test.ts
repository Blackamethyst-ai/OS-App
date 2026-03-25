// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock stores before importing
const mockSetMode = vi.fn();
const mockSetBibliomorphicState = vi.fn();
const mockSetCodeStudioState = vi.fn();
const mockSetProcessState = vi.fn();
const mockUplinkData = vi.fn();

vi.mock('../../store', () => ({
  useAppStore: {
    getState: () => ({
      actions: {
        setMode: mockSetMode,
        setBibliomorphicState: mockSetBibliomorphicState,
        setCodeStudioState: mockSetCodeStudioState,
        setProcessState: mockSetProcessState,
      },
    }),
  },
}));

vi.mock('../../stores/useSystemMind', () => ({
  useSystemMind: {
    getState: () => ({
      uplinkData: mockUplinkData,
    }),
  },
}));

import { AppMode } from '../../types';
import {
  findTab,
  findTabsInSector,
  parseTabNavigation,
  navigateToTab,
  generateTabContext,
  getAllSectors,
  getTabById,
  TAB_REGISTRY,
} from '../tabNavigationRegistry';

describe('tabNavigationRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // findTab
  // =========================================================================
  describe('findTab', () => {
    it('finds a tab by exact ID', () => {
      const tab = findTab('nexus-main');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('nexus-main');
      expect(tab!.sectorMode).toBe('NEXUS');
    });

    it('finds a tab by exact tab key (case-insensitive)', () => {
      const tab = findTab('STORYBOARD');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('cinema-storyboard');
    });

    it('finds a tab by alias', () => {
      const tab = findTab('god mode');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('archon-main');
    });

    it('finds a tab by partial alias match', () => {
      const tab = findTab('knowledge graph');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('memory-graph');
    });

    it('finds a tab by label match', () => {
      const tab = findTab('screening room');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('cinema-teaser');
    });

    it('returns null for non-existent tab', () => {
      const tab = findTab('this-tab-does-not-exist-xyz');
      expect(tab).toBeNull();
    });

    it('handles empty string gracefully', () => {
      // Empty string may match something via partial, but should not throw
      expect(() => findTab('')).not.toThrow();
    });

    it('trims and lowercases input', () => {
      const tab = findTab('  NEXUS-MAIN  ');
      expect(tab).not.toBeNull();
      expect(tab!.id).toBe('nexus-main');
    });
  });

  // =========================================================================
  // findTabsInSector
  // =========================================================================
  describe('findTabsInSector', () => {
    it('returns all tabs for a given sector', () => {
      const tabs = findTabsInSector(AppMode.IMAGE_GEN);
      expect(tabs.length).toBe(4);
      const ids = tabs.map(t => t.id);
      expect(ids).toContain('cinema-single');
      expect(ids).toContain('cinema-storyboard');
      expect(ids).toContain('cinema-video');
      expect(ids).toContain('cinema-teaser');
    });

    it('returns tabs for NEXUS special sector', () => {
      const tabs = findTabsInSector(AppMode.NEXUS);
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe('nexus-main');
    });

    it('returns empty array for a sector with no registered tabs', () => {
      // META_LEARNING has no tabs in the registry
      const tabs = findTabsInSector(AppMode.META_LEARNING);
      expect(tabs).toEqual([]);
    });
  });

  // =========================================================================
  // getTabById
  // =========================================================================
  describe('getTabById', () => {
    it('returns the tab definition for a valid ID', () => {
      const tab = getTabById('code-ide');
      expect(tab).toBeDefined();
      expect(tab!.tabLabel).toBe('IDE');
      expect(tab!.sectorMode).toBe(AppMode.CODE_STUDIO);
    });

    it('returns undefined for an invalid ID', () => {
      expect(getTabById('nonexistent-id')).toBeUndefined();
    });
  });

  // =========================================================================
  // getAllSectors
  // =========================================================================
  describe('getAllSectors', () => {
    it('returns unique sector labels', () => {
      const sectors = getAllSectors();
      expect(sectors.length).toBeGreaterThan(0);
      // No duplicates
      expect(new Set(sectors).size).toBe(sectors.length);
      expect(sectors).toContain('Nexus');
      expect(sectors).toContain('Research');
      expect(sectors).toContain('Cinema');
      expect(sectors).toContain('Hardware');
    });
  });

  // =========================================================================
  // parseTabNavigation
  // =========================================================================
  describe('parseTabNavigation', () => {
    it('parses a simple tab query', () => {
      const result = parseTabNavigation('nexus');
      expect(result.success).toBe(true);
      expect(result.sector).toBe('NEXUS');
      expect(result.tabLabel).toBe('Nexus Matrix');
      expect(result.route).toBe('/nexus');
    });

    it('strips navigation prefixes like "go to"', () => {
      const result = parseTabNavigation('go to dashboard');
      expect(result.success).toBe(true);
      // "dashboard" maps to AUTONOMOUS_FINANCE in the actual tab registry
      expect(result.sector).toBeDefined();
    });

    it('strips navigation prefixes like "switch to"', () => {
      const result = parseTabNavigation('switch to ide');
      expect(result.success).toBe(true);
      expect(result.sector).toBe(AppMode.CODE_STUDIO);
      expect(result.tab).toBe('IDE');
    });

    it('strips trailing "tab" / "view" suffixes', () => {
      const result = parseTabNavigation('open the storyboard tab');
      expect(result.success).toBe(true);
      expect(result.tab).toBe('STORYBOARD');
    });

    it('parses "X tab in Y" pattern with sector hint', () => {
      const result = parseTabNavigation('cascade in CPB');
      expect(result.success).toBe(true);
      expect(result.sector).toBe(AppMode.CPB_TEST);
      expect(result.tab).toBe('cascade');
    });

    it('returns failure result with suggestions for unknown query', () => {
      const result = parseTabNavigation('nonexistent-tab-xyz');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find tab');
    });

    it('detects subtabs for nexus', () => {
      const result = parseTabNavigation('nexus cloud');
      expect(result.success).toBe(true);
      expect(result.subtab).toBe('CLOUD');
      expect(result.subtabLabel).toBe('Cloud');
    });
  });

  // =========================================================================
  // navigateToTab
  // =========================================================================
  describe('navigateToTab', () => {
    it('sets mode and hash for a standard sector tab', () => {
      const result = navigateToTab('ide');
      expect(result.success).toBe(true);
      expect(mockSetMode).toHaveBeenCalledWith(AppMode.CODE_STUDIO);
      expect(window.location.hash).toBe('#/code');
      expect(mockSetCodeStudioState).toHaveBeenCalledWith({ activeTab: 'IDE' });
    });

    it('calls setBibliomorphicState for research tabs', () => {
      const result = navigateToTab('discovery');
      expect(result.success).toBe(true);
      expect(mockSetBibliomorphicState).toHaveBeenCalledWith({ activeTab: 'discovery' });
    });

    it('calls setProcessState for process map tabs', () => {
      const result = navigateToTab('living map');
      expect(result.success).toBe(true);
      expect(mockSetProcessState).toHaveBeenCalledWith({ activeTab: 'living_map' });
    });

    it('dispatches voice-tab-change event for sectors without direct store mapping', () => {
      const listener = vi.fn();
      window.addEventListener('voice-tab-change', listener);

      navigateToTab('single image');
      expect(listener).toHaveBeenCalled();
      const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.sector).toBe(AppMode.IMAGE_GEN);
      expect(detail.tab).toBe('SINGLE');

      window.removeEventListener('voice-tab-change', listener);
    });

    it('triggers SystemMind uplinkData on successful navigation', () => {
      navigateToTab('dashboard');
      expect(mockUplinkData).toHaveBeenCalledWith('tab_change', expect.objectContaining({
        timestamp: expect.any(Number),
      }));
    });

    it('returns failure without calling stores for unknown tab', () => {
      const result = navigateToTab('nonexistent-xyz');
      expect(result.success).toBe(false);
      expect(mockSetMode).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // generateTabContext
  // =========================================================================
  describe('generateTabContext', () => {
    it('generates context string with all sectors', () => {
      const context = generateTabContext();
      expect(context).toContain('=== TAB NAVIGATION ===');
      expect(context).toContain('ALL SECTORS:');
      expect(context).toContain('USAGE:');
    });

    it('includes current sector details when provided', () => {
      const context = generateTabContext(AppMode.IMAGE_GEN);
      expect(context).toContain('CURRENT SECTOR (Cinema)');
      expect(context).toContain('Single Image');
      expect(context).toContain('Storyboard');
    });

    it('includes subtab info for nexus', () => {
      const context = generateTabContext(AppMode.NEXUS);
      expect(context).toContain('CURRENT SECTOR (Nexus)');
      expect(context).toContain('Subtabs:');
    });

    it('handles sector with no registered tabs gracefully', () => {
      const context = generateTabContext(AppMode.META_LEARNING);
      // Should still produce valid output without current sector section
      expect(context).toContain('ALL SECTORS:');
    });
  });

  // =========================================================================
  // TAB_REGISTRY integrity
  // =========================================================================
  describe('TAB_REGISTRY', () => {
    it('has unique IDs across all entries', () => {
      const ids = TAB_REGISTRY.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every tab has at least one alias', () => {
      for (const tab of TAB_REGISTRY) {
        expect(tab.aliases.length).toBeGreaterThan(0);
      }
    });

    it('every tab has a non-empty description', () => {
      for (const tab of TAB_REGISTRY) {
        expect(tab.description.length).toBeGreaterThan(0);
      }
    });
  });
});
