/**
 * Tests for CognitiveStorageIntegration
 *
 * Validates episode storage, querying, consolidation, sleep metrics,
 * embedding generation, import/export, and statistics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../libs/agent-core-sdk/src/client', () => {
  const MockAgentCoreClient = vi.fn(function (this: any) {
    this.isHealthy = vi.fn().mockResolvedValue(false);
    this.health = vi.fn().mockResolvedValue({});
    this.createFinding = vi.fn().mockResolvedValue({});
    this.search = vi.fn().mockResolvedValue([]);
  });
  return { AgentCoreClient: MockAgentCoreClient };
});

import {
  CognitiveStorageIntegration,
  createCognitiveStorage,
} from '../cognitive/storageIntegration';
import type { EpisodeRecord, ConsolidationLogRecord, SleepMetricsRecord } from '../cognitive/storageIntegration';
import type { Episode } from '../cognitive/wakeSleep';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: overrides.id || `ep-${Math.random().toString(36).slice(2, 8)}`,
    taskId: overrides.taskId || 'task-1',
    intent: overrides.intent || 'test intent',
    content: overrides.content || { data: 'test content' },
    result: overrides.result || null,
    importance: overrides.importance || {
      dqScore: 0.7,
      surprise: 0.5,
      emotionalSalience: 0.3,
      recency: 0.8,
      accessCount: 1,
      priority: 0.5,
    },
    metadata: overrides.metadata || {
      layerId: 'genome' as any,
      latencyMs: 100,
      tokensUsed: 50,
      contextPages: [],
      tags: ['test'],
      domain: 'testing',
      linkedEpisodes: [],
    },
    createdAt: overrides.createdAt || Date.now(),
    consolidated: overrides.consolidated ?? false,
  } as Episode;
}

describe('CognitiveStorageIntegration', () => {
  let storage: CognitiveStorageIntegration;

  beforeEach(() => {
    CognitiveStorageIntegration.resetInstance();
    storage = CognitiveStorageIntegration.getInstance({
      preferredBackend: 'memory',
      enableApiSync: false,
    });
  });

  // ---------------------------------------------------------------------------
  // Singleton
  // ---------------------------------------------------------------------------

  it('should return same instance from getInstance()', () => {
    const a = CognitiveStorageIntegration.getInstance();
    const b = CognitiveStorageIntegration.getInstance();
    expect(a).toBe(b);
  });

  it('should create fresh instance after resetInstance()', () => {
    const before = CognitiveStorageIntegration.getInstance();
    CognitiveStorageIntegration.resetInstance();
    const after = CognitiveStorageIntegration.getInstance();
    expect(after).not.toBe(before);
  });

  // ---------------------------------------------------------------------------
  // Episode Storage
  // ---------------------------------------------------------------------------

  it('should store an episode and return its ID', async () => {
    const episode = createMockEpisode({ id: 'store-1' });
    const id = await storage.storeEpisode(episode);
    expect(id).toBe('store-1');
  });

  it('should increment episode count after storing', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'c1' }));
    await storage.storeEpisode(createMockEpisode({ id: 'c2' }));

    const status = storage.getStatus();
    expect(status.episodeCount).toBe(2);
  });

  it('should auto-initialize when storing before explicit init', async () => {
    CognitiveStorageIntegration.resetInstance();
    const fresh = CognitiveStorageIntegration.getInstance({
      preferredBackend: 'memory',
      enableApiSync: false,
    });

    const id = await fresh.storeEpisode(createMockEpisode({ id: 'auto-init' }));
    expect(id).toBe('auto-init');
    expect(fresh.getStatus().initialized).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Episode Querying
  // ---------------------------------------------------------------------------

  it('should query episodes by sessionId', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'q1' }));
    await storage.storeEpisode(createMockEpisode({ id: 'q2' }));

    // All episodes get sessionId 'default' since we didn't set config.sessionId
    const results = await storage.queryEpisodes({ sessionId: 'default' });
    expect(results).toHaveLength(2);
  });

  it('should query episodes by consolidated status', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'cons1', consolidated: false }));
    await storage.storeEpisode(createMockEpisode({ id: 'cons2', consolidated: true }));

    // The store converts consolidated boolean properly
    const unconsolidated = await storage.queryEpisodes({ consolidated: false });
    expect(unconsolidated.length).toBeGreaterThanOrEqual(1);
  });

  it('should query with limit', async () => {
    for (let i = 0; i < 5; i++) {
      await storage.storeEpisode(createMockEpisode({ id: `lim-${i}` }));
    }

    const results = await storage.queryEpisodes({ limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('should query episodes by domain', async () => {
    await storage.storeEpisode(createMockEpisode({
      id: 'dom1',
      metadata: {
        layerId: 'genome' as any,
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: [],
        tags: [],
        domain: 'engineering',
        linkedEpisodes: [],
      },
    }));
    await storage.storeEpisode(createMockEpisode({
      id: 'dom2',
      metadata: {
        layerId: 'genome' as any,
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: [],
        tags: [],
        domain: 'science',
        linkedEpisodes: [],
      },
    }));

    const results = await storage.queryEpisodes({ domain: 'engineering' });
    expect(results).toHaveLength(1);
    expect(results[0].metadata.domain).toBe('engineering');
  });

  // ---------------------------------------------------------------------------
  // Consolidation Log
  // ---------------------------------------------------------------------------

  it('should store consolidation log and update episode', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'ep-cons' }));

    await storage.storeConsolidation({
      episodeId: 'ep-cons',
      phase: 'nrem',
      durationMs: 500,
      beforeScore: 0.5,
      afterScore: 0.8,
      patternsIdentified: ['pattern-a'],
      ewcApplied: true,
    });

    const status = storage.getStatus();
    expect(status.consolidationCount).toBe(1);

    const history = storage.getConsolidationHistory('ep-cons');
    expect(history).toHaveLength(1);
    expect(history[0].phase).toBe('nrem');
    expect(history[0].ewc_applied).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Sleep Metrics
  // ---------------------------------------------------------------------------

  it('should store sleep metrics', async () => {
    await storage.storeSleepMetrics({
      cycleId: 'cycle-1',
      wakeDuration: 1000,
      nremDuration: 2000,
      remDuration: 500,
      episodesConsolidated: 5,
      forgettingRate: 0.1,
      forwardTransfer: 0.8,
      avgDqScore: 0.75,
      sleepTrigger: 'time-based',
      crossDomainPatterns: ['cross-1'],
    });

    const status = storage.getStatus();
    expect(status.sleepMetricsCount).toBe(1);

    const metrics = storage.getSleepMetrics('cycle-1');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].cycle_id).toBe('cycle-1');
    expect(metrics[0].forward_transfer).toBe(0.8);
  });

  it('should return all sleep metrics when no cycleId specified', async () => {
    await storage.storeSleepMetrics({
      cycleId: 'c1',
      wakeDuration: 1000,
      nremDuration: 2000,
      remDuration: 500,
      episodesConsolidated: 3,
      forgettingRate: 0.1,
      forwardTransfer: 0.7,
      avgDqScore: 0.7,
      sleepTrigger: 'capacity-based',
    });
    await storage.storeSleepMetrics({
      cycleId: 'c2',
      wakeDuration: 1500,
      nremDuration: 2500,
      remDuration: 700,
      episodesConsolidated: 4,
      forgettingRate: 0.05,
      forwardTransfer: 0.9,
      avgDqScore: 0.8,
      sleepTrigger: 'quality-based',
    });

    const all = storage.getSleepMetrics();
    expect(all).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Embedding Generation
  // ---------------------------------------------------------------------------

  it('should generate a simple embedding as fallback', async () => {
    const embedding = await storage.generateEmbedding('test query');
    expect(embedding).toHaveLength(1024);
    // Should be normalized
    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 1);
  });

  it('should cache embeddings for same text', async () => {
    const first = await storage.generateEmbedding('cached text');
    const second = await storage.generateEmbedding('cached text');
    expect(first).toBe(second); // Same reference from cache
  });

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  it('should store episodes in batch', async () => {
    const episodes = [
      createMockEpisode({ id: 'batch-1' }),
      createMockEpisode({ id: 'batch-2' }),
      createMockEpisode({ id: 'batch-3' }),
    ];

    const ids = await storage.storeEpisodesBatch(episodes);
    expect(ids).toEqual(['batch-1', 'batch-2', 'batch-3']);
    expect(storage.getStatus().episodeCount).toBe(3);
  });

  it('should get unconsolidated episodes', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'u1', consolidated: false }));
    await storage.storeEpisode(createMockEpisode({ id: 'u2', consolidated: false }));

    const episodes = await storage.getUnconsolidatedEpisodes();
    expect(episodes.length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  it('should export all data', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'exp-1' }));
    await storage.storeConsolidation({
      episodeId: 'exp-1',
      phase: 'nrem',
      durationMs: 100,
      beforeScore: 0.4,
      afterScore: 0.7,
    });

    const data = storage.exportData();
    expect(data.episodes).toHaveLength(1);
    expect(data.consolidationLogs).toHaveLength(1);
    expect(data.sleepMetrics).toHaveLength(0);
  });

  it('should import data and update counts', () => {
    const episodes: EpisodeRecord[] = [
      {
        id: 'imp-1',
        session_id: 'sess-1',
        task_id: 'task-1',
        content: '{"data":"imported"}',
        importance: 0.6,
        learning_speed: 1.0,
        exposure_count: 0,
        last_replayed: null,
        consolidated: false,
        created_at: Date.now(),
        type: 'interaction',
        intent: 'imported episode',
        dq_score: 0.7,
        tags: '["imported"]',
        domain: null,
        embedding: null,
      },
    ];

    storage.importData({ episodes });
    expect(storage.getStatus().episodeCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  it('should return aggregate statistics', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'stat-1' }));
    await storage.storeEpisode(createMockEpisode({ id: 'stat-2' }));

    const stats = storage.getStatistics();
    expect(stats.totalEpisodes).toBe(2);
    expect(stats.avgImportance).toBeGreaterThan(0);
    expect(stats.avgDqScore).toBeGreaterThan(0);
  });

  it('should return empty statistics when no data', () => {
    const stats = storage.getStatistics();
    expect(stats.totalEpisodes).toBe(0);
    expect(stats.avgImportance).toBe(0);
    expect(stats.avgDqScore).toBe(0);
    expect(stats.avgForwardTransfer).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Config & Status
  // ---------------------------------------------------------------------------

  it('should return config', () => {
    const config = storage.getConfig();
    expect(config.preferredBackend).toBe('memory');
  });

  it('should update config', () => {
    storage.setConfig({ project: 'new-project' });
    expect(storage.getConfig().project).toBe('new-project');
  });

  it('should set session ID', () => {
    storage.setSessionId('sess-abc');
    expect(storage.getConfig().sessionId).toBe('sess-abc');
  });

  it('should clear all data', async () => {
    await storage.storeEpisode(createMockEpisode({ id: 'clr-1' }));
    storage.clearAll();

    const status = storage.getStatus();
    expect(status.episodeCount).toBe(0);
    expect(status.consolidationCount).toBe(0);
    expect(status.sleepMetricsCount).toBe(0);
  });
});

describe('createCognitiveStorage()', () => {
  it('should create a fresh storage instance', () => {
    const storage = createCognitiveStorage({ preferredBackend: 'memory', enableApiSync: false });
    expect(storage).toBeInstanceOf(CognitiveStorageIntegration);
    expect(storage.getStatus().initialized).toBe(false);
  });
});
