// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../types', () => {
  const AppMode = {
    DASHBOARD: 'DASHBOARD',
    METAVENTIONS_HUB: 'METAVENTIONS_HUB',
    BIBLIOMORPHIC: 'BIBLIOMORPHIC',
    PROCESS_MAP: 'PROCESS_MAP',
    MEMORY_CORE: 'MEMORY_CORE',
    IMAGE_GEN: 'IMAGE_GEN',
    HARDWARE_ENGINEER: 'HARDWARE_ENGINEER',
    CODE_STUDIO: 'CODE_STUDIO',
    VOICE_MODE: 'VOICE_MODE',
    SYNTHESIS_BRIDGE: 'SYNTHESIS_BRIDGE',
    BICAMERAL: 'BICAMERAL',
    AGENT_CONTROL: 'AGENT_CONTROL',
    AUTONOMOUS_FINANCE: 'AUTONOMOUS_FINANCE',
    AGENT_CORE_TEST: 'AGENT_CORE_TEST',
    CPB_TEST: 'CPB_TEST',
    ARCHON: 'ARCHON',
    META_LEARNING: 'META_LEARNING',
    SOVEREIGN_GALLERY: 'SOVEREIGN_GALLERY',
  } as const;
  return { AppMode };
});

import {
  UI_KNOWLEDGE_BASE,
  getSectorContext,
  getNavigationContext,
  getFullSystemContext,
  getVisibleContext,
} from '../voiceUIContext';
import { AppMode } from '../../types';

describe('voiceUIContext', () => {
  // 1
  describe('UI_KNOWLEDGE_BASE', () => {
    it('should contain an entry for every AppMode value', () => {
      const modes = Object.values(AppMode);
      for (const mode of modes) {
        expect(UI_KNOWLEDGE_BASE[mode as AppMode]).toBeDefined();
      }
    });

    it('should have required fields on each entry', () => {
      for (const entry of Object.values(UI_KNOWLEDGE_BASE)) {
        expect(entry.id).toBeDefined();
        expect(typeof entry.name).toBe('string');
        expect(typeof entry.shortName).toBe('string');
        expect(typeof entry.description).toBe('string');
        expect(Array.isArray(entry.features)).toBe(true);
        expect(entry.features.length).toBeGreaterThan(0);
        expect(Array.isArray(entry.keyComponents)).toBe(true);
        expect(Array.isArray(entry.useCases)).toBe(true);
        expect(Array.isArray(entry.voiceCommands)).toBe(true);
        expect(entry.voiceCommands.length).toBeGreaterThan(0);
      }
    });
  });

  // 2
  describe('getSectorContext', () => {
    it('should return empty string for invalid mode', () => {
      const result = getSectorContext('INVALID_MODE' as AppMode);
      expect(result).toBe('');
    });

    it('should return sector name and description for valid mode', () => {
      const result = getSectorContext(AppMode.DASHBOARD);
      expect(result).toContain('Ecosystem Dashboard');
      expect(result).toContain('CURRENT SECTOR');
    });

    it('should include features list', () => {
      const result = getSectorContext(AppMode.DASHBOARD);
      expect(result).toContain('KEY FEATURES');
      expect(result).toContain('Real-time system health');
    });

    it('should include use cases', () => {
      const result = getSectorContext(AppMode.BIBLIOMORPHIC);
      expect(result).toContain('TYPICAL USE CASES');
      expect(result).toContain('Analyze research papers');
    });

    it('should include voice commands', () => {
      const result = getSectorContext(AppMode.VOICE_MODE);
      expect(result).toContain('VOICE COMMANDS FOR THIS SECTOR');
      expect(result).toContain('voice mode');
    });
  });

  // 3
  describe('getNavigationContext', () => {
    it('should list all available sectors', () => {
      const result = getNavigationContext();
      expect(result).toContain('AVAILABLE SECTORS');
      expect(result).toContain('Ecosystem Dashboard');
      expect(result).toContain('Research Lab');
      expect(result).toContain('Voice Core');
    });

    it('should include navigation examples', () => {
      const result = getNavigationContext();
      expect(result).toContain('NAVIGATION COMMAND EXAMPLES');
      expect(result).toContain('Take me to Research');
      expect(result).toContain('Go to Swarm');
    });

    it('should use shortName uppercase for sector labels', () => {
      const result = getNavigationContext();
      expect(result).toContain('ECOSYSTEM');
      expect(result).toContain('VOICE');
    });
  });

  // 4
  describe('getFullSystemContext', () => {
    it('should include system title', () => {
      const result = getFullSystemContext();
      expect(result).toContain('METAVENTIONS OS');
      expect(result).toContain('SOVEREIGN OPERATING SYSTEM');
    });

    it('should include sector count', () => {
      const count = Object.keys(UI_KNOWLEDGE_BASE).length;
      const result = getFullSystemContext();
      expect(result).toContain(`${count} specialized sectors`);
    });

    it('should include system capabilities', () => {
      const result = getFullSystemContext();
      expect(result).toContain('SYSTEM CAPABILITIES');
      expect(result).toContain('Multi-agent AI orchestration');
      expect(result).toContain('Real-time voice interaction');
    });

    it('should include navigation context', () => {
      const result = getFullSystemContext();
      expect(result).toContain('AVAILABLE SECTORS');
      expect(result).toContain('NAVIGATION COMMAND EXAMPLES');
    });
  });

  // 5
  describe('getVisibleContext', () => {
    it('should combine sector context and navigation context', () => {
      const result = getVisibleContext(AppMode.CODE_STUDIO);
      expect(result).toContain('Logic (Code Studio)');
      expect(result).toContain('AVAILABLE SECTORS');
    });

    it('should append additional context when provided', () => {
      const result = getVisibleContext(AppMode.DASHBOARD, {
        activeAgents: 3,
        cpuUsage: '45%',
      });
      expect(result).toContain('CURRENT STATE');
      expect(result).toContain('activeAgents: 3');
      expect(result).toContain('cpuUsage: 45%');
    });

    it('should filter out null/undefined from additional context', () => {
      const result = getVisibleContext(AppMode.DASHBOARD, {
        valid: 'yes',
        empty: null,
        undef: undefined,
      });
      expect(result).toContain('valid: yes');
      expect(result).not.toContain('empty');
      expect(result).not.toContain('undef');
    });

    it('should stringify object values in additional context', () => {
      const result = getVisibleContext(AppMode.DASHBOARD, {
        config: { nested: true },
      });
      expect(result).toContain('config: {"nested":true}');
    });

    it('should work without additional context', () => {
      const result = getVisibleContext(AppMode.IMAGE_GEN);
      expect(result).toContain('Cinema (Image Generation)');
      expect(result).not.toContain('CURRENT STATE');
    });
  });

  // 6 - specific sector data tests
  describe('specific sector knowledge entries', () => {
    it('ARCHON should be "God Mode"', () => {
      const archon = UI_KNOWLEDGE_BASE[AppMode.ARCHON];
      expect(archon.name).toContain('Archon');
      expect(archon.description).toContain('supreme command center');
    });

    it('SOVEREIGN_GALLERY should have masonry feature', () => {
      const gallery = UI_KNOWLEDGE_BASE[AppMode.SOVEREIGN_GALLERY];
      expect(gallery.features.some(f => f.toLowerCase().includes('masonry'))).toBe(true);
    });
  });
});
