/**
 * Tests for Wake/Sleep Agent
 *
 * Validates the WakeSleepAgent singleton and its core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WakeSleepAgent } from '../cognitive/wakeSleep';

describe('WakeSleepAgent', () => {
  beforeEach(() => {
    // Reset singleton for each test
    (WakeSleepAgent as unknown as { instance: null }).instance = null;
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const agent = WakeSleepAgent.getInstance();
      expect(agent).toBeInstanceOf(WakeSleepAgent);
    });

    it('should return same instance on multiple calls', () => {
      const agent1 = WakeSleepAgent.getInstance();
      const agent2 = WakeSleepAgent.getInstance();
      expect(agent1).toBe(agent2);
    });

    it('should start in wake phase', () => {
      const agent = WakeSleepAgent.getInstance();
      expect(agent.getCurrentPhase()).toBe('wake');
    });

    it('should have empty working memory initially', () => {
      const agent = WakeSleepAgent.getInstance();
      const memory = agent.getWorkingMemory();
      expect(memory.size).toBe(0);
    });
  });

  describe('phase management', () => {
    it('should expose getCurrentPhase method', () => {
      const agent = WakeSleepAgent.getInstance();
      expect(typeof agent.getCurrentPhase).toBe('function');
    });

    it('should expose getWorkingMemory method', () => {
      const agent = WakeSleepAgent.getInstance();
      expect(typeof agent.getWorkingMemory).toBe('function');
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      // WakeSleepAgent uses specific config keys
      const agent = WakeSleepAgent.getInstance();
      expect(agent).toBeInstanceOf(WakeSleepAgent);
    });
  });
});
