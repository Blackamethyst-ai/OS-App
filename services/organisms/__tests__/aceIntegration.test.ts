/**
 * Tests for ACEIntegration (swarm/aceIntegration.ts)
 *
 * Tests the ACE consensus bridge, singleton pattern, connection lifecycle,
 * auction enrichment, consensus recording, and configuration management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACEIntegration,
  createACEIntegration,
  type ACEIntegrationConfig,
  type EnrichedAuctionConfig,
} from '../swarm/aceIntegration';
import type { OrganismTask } from '../../archon/types';
import type { ACEResult } from '../../../types/domain/convergence';

// Helper: create a minimal OrganismTask
function makeTask(overrides: Partial<OrganismTask> = {}): OrganismTask {
  return {
    id: 'task-1',
    intent: 'Analyze the security architecture',
    priority: 'normal',
    contextPages: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

// Helper: create a minimal ACEResult
function makeACEResult(overrides: Partial<ACEResult> = {}): ACEResult {
  return {
    taskId: 'task-1',
    output: 'Analysis complete: system is secure',
    confidence: 85,
    agentId: 'ACE_dr_ira+mike',
    executionTime: 1200,
    voteLedger: {
      winner: 'dr_ira',
      count: 3,
      runnerUp: 'mike',
      runnerUpCount: 2,
      totalRounds: 3,
      killedAgents: 0,
      participatingAgents: ['dr_ira', 'mike', 'caleb'],
    },
    dqScore: {
      score: 0.78,
      components: { validity: 0.8, specificity: 0.75, correctness: 0.8 },
      isActionable: true,
      timestamp: Date.now(),
    },
    ...overrides,
  };
}

describe('ACEIntegration', () => {
  beforeEach(() => {
    ACEIntegration.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const a = ACEIntegration.getInstance();
      const b = ACEIntegration.getInstance();
      expect(a).toBe(b);
    });

    it('should create a new instance after resetInstance', () => {
      const a = ACEIntegration.getInstance();
      ACEIntegration.resetInstance();
      const b = ACEIntegration.getInstance();
      expect(a).not.toBe(b);
    });

    it('should accept config on first creation', () => {
      const instance = ACEIntegration.getInstance({ stigmergicWeight: 0.9 });
      expect(instance.getConfig().stigmergicWeight).toBe(0.9);
    });
  });

  describe('createACEIntegration factory', () => {
    it('should reset and create a fresh instance', () => {
      const a = ACEIntegration.getInstance();
      a.connectToACE();
      expect(a.isConnected()).toBe(true);

      const b = createACEIntegration();
      expect(b.isConnected()).toBe(false);
    });

    it('should apply provided config', () => {
      const instance = createACEIntegration({ maxPriorAgents: 10 });
      expect(instance.getConfig().maxPriorAgents).toBe(10);
    });
  });

  describe('connection lifecycle', () => {
    it('should start disconnected', () => {
      const instance = createACEIntegration();
      expect(instance.isConnected()).toBe(false);
    });

    it('should connect to ACE', () => {
      const instance = createACEIntegration();
      instance.connectToACE();
      expect(instance.isConnected()).toBe(true);
    });

    it('should be idempotent - multiple connects should not error', () => {
      const instance = createACEIntegration();
      instance.connectToACE();
      instance.connectToACE(); // Should warn but not throw
      expect(instance.isConnected()).toBe(true);
    });

    it('should disconnect from ACE', () => {
      const instance = createACEIntegration();
      instance.connectToACE();
      expect(instance.isConnected()).toBe(true);

      instance.disconnect();
      expect(instance.isConnected()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const instance = createACEIntegration();
      const config = instance.getConfig();
      expect(config.stigmergicWeight).toBe(0.35);
      expect(config.minPriorConfidence).toBe(0.4);
      expect(config.enableHopGrouping).toBe(true);
      expect(config.enableDQScoring).toBe(true);
      expect(config.enablePatternLearning).toBe(true);
      expect(config.maxPriorAgents).toBe(5);
    });

    it('should merge partial config with defaults', () => {
      const instance = createACEIntegration({ stigmergicWeight: 0.8 });
      const config = instance.getConfig();
      expect(config.stigmergicWeight).toBe(0.8);
      expect(config.enableHopGrouping).toBe(true); // default preserved
    });

    it('should update config via setConfig', () => {
      const instance = createACEIntegration();
      instance.setConfig({ minPriorConfidence: 0.9 });
      expect(instance.getConfig().minPriorConfidence).toBe(0.9);
    });

    it('should return a copy of config (not a reference)', () => {
      const instance = createACEIntegration();
      const config1 = instance.getConfig();
      const config2 = instance.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('enrichAuctionWithStigmergy', () => {
    it('should auto-connect if not connected', () => {
      const instance = createACEIntegration();
      expect(instance.isConnected()).toBe(false);

      const task = makeTask();
      const result = instance.enrichAuctionWithStigmergy(task, {});
      // Should have auto-connected
      expect(instance.isConnected()).toBe(true);
      expect(result).toBeDefined();
    });

    it('should return enriched auction config with expected shape', () => {
      const instance = createACEIntegration();
      instance.connectToACE();

      const task = makeTask();
      const result = instance.enrichAuctionWithStigmergy(task, { minAgents: 3 });

      expect(result.baseConfig).toEqual({ minAgents: 3 });
      expect(Array.isArray(result.priors)).toBe(true);
      expect(Array.isArray(result.recommendedAgents)).toBe(true);
      expect(result.agentWeights).toBeInstanceOf(Map);
      expect(typeof result.enrichmentConfidence).toBe('number');
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should increment enrichment metrics', () => {
      const instance = createACEIntegration();
      instance.connectToACE();

      const task = makeTask();
      instance.enrichAuctionWithStigmergy(task, {});
      instance.enrichAuctionWithStigmergy(task, {});

      const metrics = instance.getMetrics();
      expect(metrics.enrichments).toBe(2);
    });
  });

  describe('recordACEConsensus', () => {
    it('should not throw when disconnected', () => {
      const instance = createACEIntegration();
      // Should log a warning but not throw
      expect(() => instance.recordACEConsensus(makeACEResult())).not.toThrow();
    });

    it('should record consensus and increment metrics', () => {
      const instance = createACEIntegration();
      instance.connectToACE();

      instance.recordACEConsensus(makeACEResult());
      const metrics = instance.getMetrics();
      expect(metrics.recordings).toBe(1);
      expect(metrics.state.recordingCount).toBe(1);
    });

    it('should record multiple consensus results', () => {
      const instance = createACEIntegration();
      instance.connectToACE();

      instance.recordACEConsensus(makeACEResult({ taskId: 'task-1' }));
      instance.recordACEConsensus(makeACEResult({ taskId: 'task-2' }));
      instance.recordACEConsensus(makeACEResult({ taskId: 'task-3' }));

      const metrics = instance.getMetrics();
      expect(metrics.recordings).toBe(3);
    });
  });

  describe('getSwarmPriors', () => {
    it('should auto-connect if not connected', () => {
      const instance = createACEIntegration();
      const task = makeTask();
      const priors = instance.getSwarmPriors(task);
      expect(instance.isConnected()).toBe(true);
      expect(Array.isArray(priors)).toBe(true);
    });

    it('should increment priorQueries metric', () => {
      const instance = createACEIntegration();
      instance.connectToACE();

      instance.getSwarmPriors(makeTask());
      instance.getSwarmPriors(makeTask());

      const metrics = instance.getMetrics();
      expect(metrics.priorQueries).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics with zero counts', () => {
      const instance = createACEIntegration();
      const metrics = instance.getMetrics();
      expect(metrics.enrichments).toBe(0);
      expect(metrics.recordings).toBe(0);
      expect(metrics.priorQueries).toBe(0);
      expect(metrics.hopGroupings).toBe(0);
      expect(metrics.state.connected).toBe(false);
    });

    it('should include bridge state in metrics', () => {
      const instance = createACEIntegration();
      instance.connectToACE();
      const metrics = instance.getMetrics();
      expect(metrics.state.connected).toBe(true);
      expect(metrics.state.lastConnected).toBeGreaterThan(0);
    });
  });

  describe('convertAtomicToOrganismTask', () => {
    it('should convert an AtomicTask to OrganismTask format', () => {
      const instance = createACEIntegration();
      const atomicTask = {
        id: 'atomic-1',
        instruction: 'Do something important',
        description: 'Test task',
        isolated_input: '',
        weight: 1,
        status: 'pending' as const,
        agentId: 'dr_ira',
        createdAt: Date.now(),
      };

      const orgTask = instance.convertAtomicToOrganismTask(atomicTask as any);
      expect(orgTask.id).toBe('atomic-1');
      expect(orgTask.intent).toBe('Do something important');
      expect(orgTask.priority).toBe('normal');
      expect(orgTask.contextPages).toEqual([]);
    });
  });
});
