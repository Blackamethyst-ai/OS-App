/**
 * Sector Definitions Tests
 *
 * Tests for sector lookup, alias resolution, and capability support checks.
 */

import { describe, it, expect } from 'vitest';
import {
  SECTOR_DEFINITIONS,
  getSector,
  getSectorByAlias,
  getAllSectorModes,
  sectorSupportsCapability,
} from '../providers/sectors';

describe('SectorDefinitions', () => {
  describe('SECTOR_DEFINITIONS', () => {
    it('should define all 15 sectors', () => {
      expect(SECTOR_DEFINITIONS.length).toBe(15);
    });

    it('should have unique modes for each sector', () => {
      const modes = SECTOR_DEFINITIONS.map((s) => s.mode);
      const unique = new Set(modes);
      expect(unique.size).toBe(modes.length);
    });

    it('should have non-empty labels and descriptions', () => {
      for (const sector of SECTOR_DEFINITIONS) {
        expect(sector.label.length).toBeGreaterThan(0);
        expect(sector.description.length).toBeGreaterThan(0);
      }
    });

    it('should have at least one alias per sector', () => {
      for (const sector of SECTOR_DEFINITIONS) {
        expect(sector.aliases.length).toBeGreaterThan(0);
      }
    });

    it('should have navigation capability for all sectors', () => {
      for (const sector of SECTOR_DEFINITIONS) {
        expect(sector.capabilities).toContain('navigation');
      }
    });
  });

  describe('getSector', () => {
    it('should return sector definition for valid mode', () => {
      const sector = getSector('DASHBOARD');
      expect(sector).toBeDefined();
      expect(sector?.mode).toBe('DASHBOARD');
      expect(sector?.label).toBe('Dashboard');
    });

    it('should return CODE_STUDIO sector', () => {
      const sector = getSector('CODE_STUDIO');
      expect(sector).toBeDefined();
      expect(sector?.label).toBe('Logic');
    });

    it('should return undefined for invalid mode', () => {
      const sector = getSector('INVALID_MODE' as any);
      expect(sector).toBeUndefined();
    });
  });

  describe('getSectorByAlias', () => {
    it('should find sector by mode name (case-insensitive)', () => {
      const sector = getSectorByAlias('dashboard');
      expect(sector?.mode).toBe('DASHBOARD');
    });

    it('should find sector by label (case-insensitive)', () => {
      const sector = getSectorByAlias('Research');
      expect(sector?.mode).toBe('BIBLIOMORPHIC');
    });

    it('should find sector by alias', () => {
      const sector = getSectorByAlias('home');
      expect(sector?.mode).toBe('DASHBOARD');
    });

    it('should find sector by alias (cloud -> NEXUS)', () => {
      const sector = getSectorByAlias('cloud');
      expect(sector?.mode).toBe('NEXUS');
    });

    it('should find sector by alias (code -> CODE_STUDIO)', () => {
      const sector = getSectorByAlias('code');
      expect(sector?.mode).toBe('CODE_STUDIO');
    });

    it('should find sector by alias (swarm -> AGENT_CONTROL)', () => {
      const sector = getSectorByAlias('swarm');
      expect(sector?.mode).toBe('AGENT_CONTROL');
    });

    it('should find sector by alias (treasury -> AUTONOMOUS_FINANCE)', () => {
      const sector = getSectorByAlias('treasury');
      expect(sector?.mode).toBe('AUTONOMOUS_FINANCE');
    });

    it('should return undefined for unknown alias', () => {
      const sector = getSectorByAlias('nonexistent_alias');
      expect(sector).toBeUndefined();
    });
  });

  describe('getAllSectorModes', () => {
    it('should return all sector modes', () => {
      const modes = getAllSectorModes();
      expect(modes.length).toBe(15);
      expect(modes).toContain('DASHBOARD');
      expect(modes).toContain('CODE_STUDIO');
      expect(modes).toContain('NEXUS');
      expect(modes).toContain('VOICE_MODE');
    });
  });

  describe('sectorSupportsCapability', () => {
    it('should return true when sector supports the category', () => {
      expect(sectorSupportsCapability('DASHBOARD', 'navigation')).toBe(true);
      expect(sectorSupportsCapability('DASHBOARD', 'ui')).toBe(true);
      expect(sectorSupportsCapability('DASHBOARD', 'analyze')).toBe(true);
    });

    it('should return false when sector does not support the category', () => {
      expect(sectorSupportsCapability('DASHBOARD', 'deploy')).toBe(false);
    });

    it('should return false for unknown sector', () => {
      expect(sectorSupportsCapability('UNKNOWN' as any, 'navigation')).toBe(false);
    });

    it('should correctly check CODE_STUDIO capabilities', () => {
      expect(sectorSupportsCapability('CODE_STUDIO', 'generate')).toBe(true);
      expect(sectorSupportsCapability('CODE_STUDIO', 'execute')).toBe(true);
      expect(sectorSupportsCapability('CODE_STUDIO', 'deploy')).toBe(false);
    });
  });
});
