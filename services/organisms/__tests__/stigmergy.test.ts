/**
 * Tests for Stigmergic Environment
 *
 * Validates the StigmergicEnvironment singleton and its core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StigmergicEnvironment } from '../swarm/stigmergy';
import type { VoteSignal } from '../swarm/stigmergy';

describe('StigmergicEnvironment', () => {
  beforeEach(() => {
    // Reset singleton for each test
    StigmergicEnvironment.resetInstance();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const env = StigmergicEnvironment.getInstance();
      expect(env).toBeInstanceOf(StigmergicEnvironment);
    });

    it('should return same instance on multiple calls', () => {
      const env1 = StigmergicEnvironment.getInstance();
      const env2 = StigmergicEnvironment.getInstance();
      expect(env1).toBe(env2);
    });
  });

  describe('signal deposit', () => {
    it('should expose depositSignal method', () => {
      const env = StigmergicEnvironment.getInstance();
      expect(typeof env.depositSignal).toBe('function');
    });

    it('should deposit vote signals', () => {
      const env = StigmergicEnvironment.getInstance();

      const voteSignal: VoteSignal = {
        type: 'vote',
        id: 'vote-1',
        taskId: 'task-1',
        agentId: 'agent-1',
        vote: 'approve',
        confidence: 0.9,
        strength: 0.9,
        timestamp: Date.now(),
      };

      env.depositSignal(voteSignal);

      const metrics = env.getMetrics();
      expect(metrics.signalsDeposited).toBeGreaterThanOrEqual(1);
    });
  });

  describe('signal querying', () => {
    it('should expose getTaskVotes method', () => {
      const env = StigmergicEnvironment.getInstance();
      expect(typeof env.getTaskVotes).toBe('function');
    });

    it('should query votes for a task', () => {
      const env = StigmergicEnvironment.getInstance();

      env.depositSignal({
        type: 'vote',
        id: 'vote-query-1',
        taskId: 'query-test',
        agentId: 'agent-1',
        vote: 'approve',
        confidence: 0.8,
        strength: 0.8,
        timestamp: Date.now(),
      });

      const votes = env.getTaskVotes('query-test');
      expect(votes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('consensus', () => {
    it('should expose recordConsensus method', () => {
      const env = StigmergicEnvironment.getInstance();
      expect(typeof env.recordConsensus).toBe('function');
    });
  });

  describe('priors', () => {
    it('should expose getRelevantTraces method', () => {
      const env = StigmergicEnvironment.getInstance();
      expect(typeof env.getRelevantTraces).toBe('function');
    });
  });

  describe('metrics', () => {
    it('should track signal metrics', () => {
      const env = StigmergicEnvironment.getInstance();
      const metrics = env.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.signalsDeposited).toBe('number');
    });
  });
});
