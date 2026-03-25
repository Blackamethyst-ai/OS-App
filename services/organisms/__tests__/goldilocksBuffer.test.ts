import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../cognitive/wakeSleep', () => ({
  WakeSleepAgent: vi.fn(),
  wakeSleepAgent: {},
  createWakeSleepAgent: vi.fn(),
}));

import {
  GoldilocksBuffer,
  createGoldilocksBuffer,
} from '../cognitive/goldilocksBuffer';
import type {
  GoldilocksBufferConfig,
  ReplaySelectionResult,
} from '../cognitive/goldilocksBuffer';
import type { Episode } from '../cognitive/wakeSleep';

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: overrides.id || `ep-${Math.random().toString(36).substr(2, 6)}`,
    taskId: overrides.taskId || 'task-1',
    intent: overrides.intent || 'test intent',
    content: overrides.content || { data: 'test' },
    result: overrides.result || null,
    importance: overrides.importance || {
      dqScore: 0.5,
      surprise: 0.5,
      emotionalSalience: 0.3,
      recency: 0.8,
      accessCount: 1,
      priority: 0.5,
    },
    metadata: overrides.metadata || {
      layerId: 'cognitive' as const,
      latencyMs: 100,
      tokensUsed: 50,
      contextPages: [],
      tags: ['test'],
      domain: 'testing',
      linkedEpisodes: [],
    },
    createdAt: overrides.createdAt || Date.now(),
    consolidated: overrides.consolidated || false,
  };
}

describe('GoldilocksBuffer', () => {
  let buffer: GoldilocksBuffer;

  beforeEach(() => {
    // Reset singleton and create fresh instance
    GoldilocksBuffer.resetInstance();
    buffer = GoldilocksBuffer.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const a = GoldilocksBuffer.getInstance();
      const b = GoldilocksBuffer.getInstance();
      expect(a).toBe(b);
    });

    it('should create a new instance after reset', () => {
      const a = GoldilocksBuffer.getInstance();
      GoldilocksBuffer.resetInstance();
      const b = GoldilocksBuffer.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('createGoldilocksBuffer factory', () => {
    it('should create a new buffer with custom config', () => {
      const b = createGoldilocksBuffer({ tooHardThreshold: 0.2 });
      const config = b.getConfig();
      expect(config.tooHardThreshold).toBe(0.2);
    });
  });

  describe('computeLearningSpeed', () => {
    it('should estimate initial learning speed for new episodes', () => {
      const episode = makeEpisode({
        importance: {
          dqScore: 0.5,
          surprise: 0.5,
          emotionalSalience: 0.3,
          recency: 0.8,
          accessCount: 1,
          priority: 0.5,
        },
      });
      const speed = buffer.computeLearningSpeed(episode);
      expect(speed).toBeGreaterThanOrEqual(0);
      expect(speed).toBeLessThanOrEqual(1);
    });

    it('should return higher speed for high-DQ low-surprise episodes', () => {
      const easyEpisode = makeEpisode({
        importance: {
          dqScore: 0.95,
          surprise: 0.05,
          emotionalSalience: 0.1,
          recency: 0.8,
          accessCount: 1,
          priority: 0.2,
        },
      });
      const hardEpisode = makeEpisode({
        importance: {
          dqScore: 0.05,
          surprise: 0.95,
          emotionalSalience: 0.1,
          recency: 0.8,
          accessCount: 1,
          priority: 0.2,
        },
      });

      const easySpeed = buffer.computeLearningSpeed(easyEpisode);
      const hardSpeed = buffer.computeLearningSpeed(hardEpisode);
      expect(easySpeed).toBeGreaterThan(hardSpeed);
    });

    it('should use tracked metrics when available', () => {
      const episode = makeEpisode({ id: 'tracked-ep' });
      buffer.recordLearningOutcome('tracked-ep', 0.6);
      buffer.recordLearningOutcome('tracked-ep', 0.8);

      const speed = buffer.computeLearningSpeed(episode);
      expect(speed).toBeGreaterThanOrEqual(0);
      expect(speed).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyEpisode', () => {
    it('should classify balanced episodes as goldilocks', () => {
      const episode = makeEpisode({
        importance: {
          dqScore: 0.5,
          surprise: 0.5,
          emotionalSalience: 0.5,
          recency: 0.8,
          accessCount: 1,
          priority: 0.5,
        },
      });
      const zone = buffer.classifyEpisode(episode);
      expect(zone).toBe('goldilocks');
    });

    it('should classify very easy episodes as too_easy', () => {
      // With custom thresholds to make classification predictable
      GoldilocksBuffer.resetInstance();
      buffer = GoldilocksBuffer.getInstance({ tooEasyThreshold: 0.6, tooHardThreshold: 0.3 });

      const episode = makeEpisode({
        importance: {
          dqScore: 0.99,
          surprise: 0.01,
          emotionalSalience: 0.1,
          recency: 0.8,
          accessCount: 1,
          priority: 0.1,
        },
      });
      const zone = buffer.classifyEpisode(episode);
      expect(zone).toBe('tooEasy');
    });
  });

  describe('selectForReplay', () => {
    it('should return a ReplaySelectionResult with correct structure', () => {
      const episodes = [makeEpisode(), makeEpisode(), makeEpisode()];
      const result = buffer.selectForReplay(episodes, 10);

      expect(result).toHaveProperty('selected');
      expect(result).toHaveProperty('tooEasy');
      expect(result).toHaveProperty('tooHard');
      expect(result).toHaveProperty('totalConsidered');
      expect(result).toHaveProperty('budgetUsed');
      expect(result).toHaveProperty('stats');
      expect(result.totalConsidered).toBe(3);
    });

    it('should respect budget limits', () => {
      const episodes = Array.from({ length: 20 }, () => makeEpisode());
      const result = buffer.selectForReplay(episodes, 5);

      expect(result.selected.length).toBeLessThanOrEqual(5);
    });

    it('should return empty selection for empty input', () => {
      const result = buffer.selectForReplay([], 10);
      expect(result.selected).toHaveLength(0);
      expect(result.totalConsidered).toBe(0);
    });

    it('should compute stats including goldilocksRatio', () => {
      const episodes = [makeEpisode(), makeEpisode()];
      const result = buffer.selectForReplay(episodes, 10);
      expect(typeof result.stats.goldilocksRatio).toBe('number');
      expect(typeof result.stats.avgLearningSpeed).toBe('number');
    });
  });

  describe('recordLearningOutcome', () => {
    it('should create new metrics for first recording', () => {
      buffer.recordLearningOutcome('ep-new', 0.7);
      const metrics = buffer.getLearningMetrics('ep-new');
      expect(metrics).toBeDefined();
      expect(metrics!.accuracy).toBe(0.7);
      expect(metrics!.exposures).toBe(1);
    });

    it('should update existing metrics on subsequent recordings', () => {
      buffer.recordLearningOutcome('ep-update', 0.5);
      buffer.recordLearningOutcome('ep-update', 0.8);

      const metrics = buffer.getLearningMetrics('ep-update');
      expect(metrics!.accuracy).toBe(0.8);
      expect(metrics!.previousAccuracy).toBe(0.5);
      expect(metrics!.exposures).toBe(2);
    });
  });

  describe('generateSyntheticReplay', () => {
    it('should create a synthetic episode with new id', () => {
      const original = makeEpisode({ id: 'orig-1' });
      const synthetic = buffer.generateSyntheticReplay(original);

      expect(synthetic.id).toContain('syn-');
      expect(synthetic.id).not.toBe(original.id);
      expect(synthetic.taskId).toContain('synthetic-');
      expect(synthetic.metadata.tags).toContain('synthetic');
    });

    it('should link back to source episode', () => {
      const original = makeEpisode({ id: 'orig-2' });
      const synthetic = buffer.generateSyntheticReplay(original);

      expect(synthetic.metadata.linkedEpisodes).toContain('orig-2');
      expect((synthetic.content as any).sourceEpisodeId).toBe('orig-2');
    });

    it('should apply noise to importance when configured', () => {
      const original = makeEpisode();
      // Generate many synthetics - at least some should differ
      const synthetics = Array.from({ length: 10 }, () =>
        buffer.generateSyntheticReplay(original, { adjustImportance: true, noiseLevel: 0.5 })
      );

      const uniqueDqScores = new Set(synthetics.map((s) => s.importance.dqScore));
      // With noise level 0.5 and 10 samples, we expect variation
      expect(uniqueDqScores.size).toBeGreaterThan(1);
    });
  });

  describe('applyEWC', () => {
    it('should update Fisher information entries', () => {
      const episode = makeEpisode({
        metadata: {
          layerId: 'cognitive' as const,
          latencyMs: 100,
          tokensUsed: 50,
          contextPages: [],
          tags: ['coding', 'debug'],
          domain: 'engineering',
          linkedEpisodes: [],
        },
      });

      buffer.applyEWC(episode);

      const tagFisher = buffer.getFisherInfo('tag:coding');
      expect(tagFisher).toBeDefined();
      expect(tagFisher!.sampleCount).toBe(1);

      const domainFisher = buffer.getFisherInfo('domain:engineering');
      expect(domainFisher).toBeDefined();
    });

    it('should accumulate Fisher info across multiple applications', () => {
      const episode = makeEpisode({
        metadata: {
          layerId: 'cognitive' as const,
          latencyMs: 100,
          tokensUsed: 50,
          contextPages: [],
          tags: ['coding'],
          domain: 'engineering',
          linkedEpisodes: [],
        },
      });

      buffer.applyEWC(episode);
      buffer.applyEWC(episode);

      const fisher = buffer.getFisherInfo('tag:coding');
      expect(fisher!.sampleCount).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics structure', () => {
      const metrics = buffer.getMetrics();
      expect(metrics).toHaveProperty('trackedEpisodes');
      expect(metrics).toHaveProperty('zoneDistribution');
      expect(metrics).toHaveProperty('avgLearningSpeed');
      expect(metrics).toHaveProperty('fisherEntries');
      expect(metrics).toHaveProperty('totalEwcPenalty');
      expect(metrics).toHaveProperty('syntheticGenerated');
      expect(metrics).toHaveProperty('selectionEfficiency');
    });

    it('should reflect recorded learning outcomes', () => {
      buffer.recordLearningOutcome('a', 0.5);
      buffer.recordLearningOutcome('b', 0.9);

      const metrics = buffer.getMetrics();
      expect(metrics.trackedEpisodes).toBe(2);
    });
  });

  describe('exportState / importState', () => {
    it('should round-trip state correctly', () => {
      buffer.recordLearningOutcome('ep-x', 0.6);
      const episode = makeEpisode({
        metadata: {
          layerId: 'cognitive' as const,
          latencyMs: 100,
          tokensUsed: 50,
          contextPages: [],
          tags: ['test-tag'],
          linkedEpisodes: [],
        },
      });
      buffer.applyEWC(episode);

      const exported = buffer.exportState();

      // Create fresh buffer and import
      GoldilocksBuffer.resetInstance();
      const newBuffer = GoldilocksBuffer.getInstance();
      newBuffer.importState(exported);

      expect(newBuffer.getLearningMetrics('ep-x')).toBeDefined();
      expect(newBuffer.getFisherInfo('tag:test-tag')).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should reset all internal state', () => {
      buffer.recordLearningOutcome('ep-1', 0.5);
      buffer.generateSyntheticReplay(makeEpisode());

      buffer.clear();

      const metrics = buffer.getMetrics();
      expect(metrics.trackedEpisodes).toBe(0);
      expect(metrics.syntheticGenerated).toBe(0);
      expect(metrics.fisherEntries).toBe(0);
    });
  });

  describe('config management', () => {
    it('should allow updating config', () => {
      buffer.setConfig({ ewcLambda: 0.8 });
      const config = buffer.getConfig();
      expect(config.ewcLambda).toBe(0.8);
      // Other values should remain defaults
      expect(config.tooHardThreshold).toBe(0.1);
    });

    it('should return a copy from getConfig', () => {
      const config = buffer.getConfig();
      config.ewcLambda = 999;
      expect(buffer.getConfig().ewcLambda).not.toBe(999);
    });
  });
});
