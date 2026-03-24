import { describe, it, expect } from 'vitest';
import { AGENT_DNA_BUILDER, HIVE_AGENTS, getAgent, getAgentNames, getAgentsByArchetype } from '../agents';

describe('agents', () => {
  describe('AGENT_DNA_BUILDER', () => {
    it('should contain 5 DNA building blocks', () => {
      expect(AGENT_DNA_BUILDER).toHaveLength(5);
    });

    it('should have required fields on each DNA entry', () => {
      for (const dna of AGENT_DNA_BUILDER) {
        expect(dna).toHaveProperty('id');
        expect(dna).toHaveProperty('label');
        expect(dna).toHaveProperty('role');
        expect(dna).toHaveProperty('color');
        expect(dna).toHaveProperty('description');
      }
    });

    it('should include known DNA ids', () => {
      const ids = AGENT_DNA_BUILDER.map(d => d.id);
      expect(ids).toContain('SKEPTIC');
      expect(ids).toContain('VISIONARY');
      expect(ids).toContain('PRAGMATIST');
      expect(ids).toContain('SYNTHESIZER');
      expect(ids).toContain('ANALYST');
    });
  });

  describe('HIVE_AGENTS', () => {
    it('should contain named agents with required fields', () => {
      const agents = Object.values(HIVE_AGENTS);
      expect(agents.length).toBeGreaterThan(0);
      for (const agent of agents) {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('voice');
        expect(agent).toHaveProperty('systemPrompt');
      }
    });

    it('should include dr_ira with correct archetype', () => {
      const drIra = HIVE_AGENTS['dr_ira'];
      expect(drIra).toBeDefined();
      expect(drIra.name).toBe('Dr. Ira');
      expect(drIra.archetype).toBe('The Sentinel');
      expect(drIra.weights?.skepticism).toBe(0.95);
    });

    it('should include generic voice personas', () => {
      expect(HIVE_AGENTS['Puck']).toBeDefined();
      expect(HIVE_AGENTS['Charon']).toBeDefined();
      expect(HIVE_AGENTS['Fenrir']).toBeDefined();
      expect(HIVE_AGENTS['Zephyr']).toBeDefined();
    });
  });

  describe('getAgent', () => {
    it('should find agent by exact id', () => {
      const agent = getAgent('dr_ira');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('Dr. Ira');
    });

    it('should find agent by name case-insensitively', () => {
      const agent = getAgent('Mike');
      expect(agent).toBeDefined();
      expect(agent!.id).toBe('mike');

      const agentLower = getAgent('mike');
      expect(agentLower).toBeDefined();
      expect(agentLower!.id).toBe('mike');
    });

    it('should find agent by uppercase name', () => {
      const agent = getAgent('CALEB');
      expect(agent).toBeDefined();
      expect(agent!.id).toBe('caleb');
    });

    it('should return undefined for unknown identifier', () => {
      const agent = getAgent('nonexistent_agent_xyz');
      expect(agent).toBeUndefined();
    });

    it('should find generic voice persona by key lookup fallback', () => {
      // 'Puck' as id won't match via find (normalized to 'puck'),
      // but falls back to HIVE_AGENTS['puck'] which is undefined since key is 'Puck'
      // However name match should work: a.name.toLowerCase() === 'puck'
      const agent = getAgent('Puck');
      expect(agent).toBeDefined();
      expect(agent!.archetype).toBe('The Trickster');
    });
  });

  describe('getAgentNames', () => {
    it('should return an array of strings', () => {
      const names = getAgentNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(typeof name).toBe('string');
      }
    });

    it('should include known agent names', () => {
      const names = getAgentNames();
      expect(names).toContain('Dr. Ira');
      expect(names).toContain('Mike');
      expect(names).toContain('Caleb');
    });
  });

  describe('getAgentsByArchetype', () => {
    it('should return agents matching the archetype', () => {
      const sentinels = getAgentsByArchetype('The Sentinel');
      expect(sentinels.length).toBeGreaterThan(0);
      expect(sentinels[0].id).toBe('dr_ira');
    });

    it('should be case-insensitive', () => {
      const sentinels = getAgentsByArchetype('the sentinel');
      expect(sentinels.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown archetype', () => {
      const result = getAgentsByArchetype('The Nonexistent');
      expect(result).toEqual([]);
    });
  });
});
