/**
 * Prompt Isolation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isolateAgent,
  getIsolatedAgents,
  getIsolatedAgent,
  containsSystemPrompt,
  sanitizeObject,
} from '../promptIsolation';
import { HIVE_AGENTS } from '../../agents';

describe('Prompt Isolation', () => {
  describe('isolateAgent', () => {
    it('should remove systemPrompt from agent', () => {
      const agent = HIVE_AGENTS['dr_ira'];
      const isolated = isolateAgent(agent);

      expect(isolated).not.toHaveProperty('systemPrompt');
      expect(isolated).toHaveProperty('id');
      expect(isolated).toHaveProperty('name');
      expect(isolated).toHaveProperty('behaviorSummary');
    });

    it('should preserve safe fields', () => {
      const agent = HIVE_AGENTS['mike'];
      const isolated = isolateAgent(agent);

      expect(isolated.id).toBe(agent.id);
      expect(isolated.name).toBe(agent.name);
      expect(isolated.archetype).toBe(agent.archetype);
      expect(isolated.capabilities).toEqual(agent.expertise);
      expect(isolated.weights).toEqual(agent.weights);
    });

    it('should generate behavior summary', () => {
      const agent = HIVE_AGENTS['dr_ira'];
      const isolated = isolateAgent(agent);

      expect(isolated.behaviorSummary).toBeTruthy();
      expect(isolated.behaviorSummary).not.toContain('COGNITIVE PROFILE');
      expect(isolated.behaviorSummary).toContain('Security-focused');
    });
  });

  describe('getIsolatedAgents', () => {
    it('should return all agents without systemPrompts', () => {
      const isolated = getIsolatedAgents();

      const agentIds = Object.keys(isolated);
      expect(agentIds.length).toBeGreaterThan(0);

      for (const id of agentIds) {
        expect(isolated[id]).not.toHaveProperty('systemPrompt');
      }
    });

    it('should maintain agent count', () => {
      const isolated = getIsolatedAgents();
      const original = Object.keys(HIVE_AGENTS);

      expect(Object.keys(isolated).length).toBe(original.length);
    });
  });

  describe('getIsolatedAgent', () => {
    it('should return isolated agent by ID', () => {
      const isolated = getIsolatedAgent('dr_ira');

      expect(isolated).toBeTruthy();
      expect(isolated?.id).toBe('dr_ira');
      expect(isolated).not.toHaveProperty('systemPrompt');
    });

    it('should return null for invalid ID', () => {
      const isolated = getIsolatedAgent('nonexistent');
      expect(isolated).toBeNull();
    });
  });

  describe('containsSystemPrompt', () => {
    it('should detect systemPrompt in object', () => {
      const obj = { systemPrompt: 'secret', other: 'data' };
      expect(containsSystemPrompt(obj)).toBe(true);
    });

    it('should detect COGNITIVE PROFILE in object', () => {
      const obj = { message: 'COGNITIVE PROFILE: secret' };
      expect(containsSystemPrompt(obj)).toBe(true);
    });

    it('should return false for clean object', () => {
      const obj = { name: 'agent', id: '123' };
      expect(containsSystemPrompt(obj)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should remove systemPrompt field', () => {
      const obj = {
        name: 'agent',
        systemPrompt: 'secret',
        data: 'keep this',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized).not.toHaveProperty('systemPrompt');
      expect(sanitized.name).toBe('agent');
      expect(sanitized.data).toBe('keep this');
    });

    it('should handle nested objects', () => {
      const obj = {
        agent: {
          systemPrompt: 'secret',
          name: 'test',
        },
        other: 'data',
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.agent).not.toHaveProperty('systemPrompt');
      expect(sanitized.agent.name).toBe('test');
      expect(sanitized.other).toBe('data');
    });

    it('should handle arrays', () => {
      const obj = {
        agents: [
          { systemPrompt: 'secret1', name: 'agent1' },
          { systemPrompt: 'secret2', name: 'agent2' },
        ],
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.agents[0]).not.toHaveProperty('systemPrompt');
      expect(sanitized.agents[1]).not.toHaveProperty('systemPrompt');
      expect(sanitized.agents[0].name).toBe('agent1');
    });
  });
});
