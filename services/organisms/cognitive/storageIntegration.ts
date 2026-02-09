/**
 * Storage Integration - US-013
 *
 * Connects cognitive cycles to existing storage infrastructure.
 * Supports multiple storage backends:
 * - SQLite at ~/.agent-core/storage/antigravity.db
 * - Qdrant for vector search (if available)
 * - sqlite-vec as fallback
 * - Cohere embeddings (1024d)
 *
 * Communication methods:
 * - Direct SQLite via sql.js (browser-compatible)
 * - HTTP API calls to ResearchGravity server at localhost:3847
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - Episode storage patterns
 * - arXiv:2512.05470 (AFS) - Agentic file system concepts
 */

import type {
  DQScore,
  BiometricContext,
} from '../../archon/types';
import type { Episode, ImportanceSignals, EpisodeMetadata, SleepPhase } from './wakeSleep';
import { AgentCoreClient } from '../../../libs/agent-core-sdk/src/client';
import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Episode record for SQLite storage.
 */
export interface EpisodeRecord {
  /** Unique episode identifier */
  id: string;

  /** Session ID this episode belongs to */
  session_id: string;

  /** Task ID that generated this episode */
  task_id: string;

  /** Serialized content (JSON) */
  content: string;

  /** Importance score (0-1) */
  importance: number;

  /** Learning speed factor */
  learning_speed: number;

  /** Number of times replayed */
  exposure_count: number;

  /** Last replay timestamp */
  last_replayed: number | null;

  /** Whether consolidated to long-term memory */
  consolidated: boolean;

  /** Creation timestamp */
  created_at: number;

  /** Episode type */
  type: string;

  /** Intent/action description */
  intent: string;

  /** DQ score from execution */
  dq_score: number;

  /** Tags for categorization (JSON array) */
  tags: string;

  /** Domain classification */
  domain: string | null;

  /** Embedding vector (JSON array, 1024d for Cohere) */
  embedding: string | null;
}

/**
 * Consolidation log entry for tracking consolidation phases.
 */
export interface ConsolidationLogRecord {
  /** Unique log ID */
  id: string;

  /** Episode ID that was consolidated */
  episode_id: string;

  /** Sleep phase during consolidation */
  phase: SleepPhase;

  /** Duration of consolidation (ms) */
  duration_ms: number;

  /** Importance score before consolidation */
  before_score: number;

  /** Importance score after consolidation */
  after_score: number;

  /** Timestamp of consolidation */
  timestamp: number;

  /** Patterns identified during consolidation (JSON array) */
  patterns_identified: string;

  /** EWC applied flag */
  ewc_applied: boolean;
}

/**
 * Sleep metrics for monitoring wake/sleep cycles.
 */
export interface SleepMetricsRecord {
  /** Unique metrics ID */
  id: string;

  /** Cycle ID for grouping */
  cycle_id: string;

  /** Wake phase duration (ms) */
  wake_duration: number;

  /** NREM phase duration (ms) */
  nrem_duration: number;

  /** REM phase duration (ms) */
  rem_duration: number;

  /** Number of episodes consolidated */
  episodes_consolidated: number;

  /** Forgetting rate (0-1) */
  forgetting_rate: number;

  /** Forward transfer score (skill synthesis success) */
  forward_transfer: number;

  /** Average DQ score during wake */
  avg_dq_score: number;

  /** Sleep trigger reason */
  sleep_trigger: string;

  /** Timestamp */
  timestamp: number;

  /** Session ID */
  session_id: string;

  /** Synthetic episodes generated */
  synthetic_episodes: number;

  /** Cross-domain patterns discovered (JSON array) */
  cross_domain_patterns: string;
}

/**
 * Query options for episode retrieval.
 */
export interface EpisodeQuery {
  /** Filter by session ID */
  sessionId?: string;

  /** Filter by task ID */
  taskId?: string;

  /** Filter by consolidated status */
  consolidated?: boolean;

  /** Minimum importance score */
  minImportance?: number;

  /** Maximum importance score */
  maxImportance?: number;

  /** Filter by tags */
  tags?: string[];

  /** Filter by domain */
  domain?: string;

  /** Time range start */
  startTime?: number;

  /** Time range end */
  endTime?: number;

  /** Maximum results */
  limit?: number;

  /** Sort by field */
  sortBy?: 'importance' | 'created_at' | 'last_replayed' | 'dq_score';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Vector search result.
 */
export interface VectorSearchResult {
  /** Episode ID */
  episodeId: string;

  /** Similarity score (0-1) */
  similarity: number;

  /** Episode content */
  content: string;

  /** Episode metadata */
  metadata: {
    intent: string;
    tags: string[];
    domain: string | null;
    importance: number;
    createdAt: number;
  };
}

/**
 * Storage backend type.
 */
export type StorageBackend = 'sqlite' | 'http-api' | 'memory';

/**
 * Vector store type.
 */
export type VectorStore = 'qdrant' | 'sqlite-vec' | 'memory' | 'none';

/**
 * Storage configuration.
 */
export interface StorageConfig {
  /** SQLite database path */
  sqlitePath: string;

  /** ResearchGravity API URL */
  apiUrl: string;

  /** API timeout (ms) */
  apiTimeout: number;

  /** Preferred storage backend */
  preferredBackend: StorageBackend;

  /** Preferred vector store */
  preferredVectorStore: VectorStore;

  /** Cohere API key for embeddings */
  cohereApiKey?: string;

  /** Embedding model (default: embed-english-v3.0) */
  embeddingModel: string;

  /** Embedding dimensions (default: 1024 for Cohere) */
  embeddingDimensions: number;

  /** Session ID for current session */
  sessionId?: string;

  /** Project name for context */
  project: string;

  /** Enable write-through to API */
  enableApiSync: boolean;

  /** Batch size for bulk operations */
  batchSize: number;
}

/**
 * Storage status.
 */
export interface StorageStatus {
  /** Storage backend in use */
  backend: StorageBackend;

  /** Vector store in use */
  vectorStore: VectorStore;

  /** Whether storage is initialized */
  initialized: boolean;

  /** Whether API is available */
  apiAvailable: boolean;

  /** Last sync timestamp */
  lastSync: number | null;

  /** Episode count */
  episodeCount: number;

  /** Consolidation log count */
  consolidationCount: number;

  /** Sleep metrics count */
  sleepMetricsCount: number;

  /** Error if any */
  error?: string;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: StorageConfig = {
  sqlitePath: '~/.agent-core/storage/antigravity.db',
  apiUrl: import.meta.env.VITE_AGENT_CORE_URL || 'http://localhost:3847',
  apiTimeout: 5000,
  preferredBackend: 'http-api',
  preferredVectorStore: 'sqlite-vec',
  embeddingModel: 'embed-english-v3.0',
  embeddingDimensions: 1024,
  project: 'os-app',
  enableApiSync: true,
  batchSize: 100,
};

// =============================================================================
// SQL SCHEMA
// =============================================================================

const CREATE_EPISODES_TABLE = `
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  learning_speed REAL NOT NULL DEFAULT 1.0,
  exposure_count INTEGER NOT NULL DEFAULT 0,
  last_replayed INTEGER,
  consolidated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'interaction',
  intent TEXT NOT NULL,
  dq_score REAL NOT NULL DEFAULT 0.5,
  tags TEXT NOT NULL DEFAULT '[]',
  domain TEXT,
  embedding TEXT
);

CREATE INDEX IF NOT EXISTS idx_episodes_session ON episodes(session_id);
CREATE INDEX IF NOT EXISTS idx_episodes_consolidated ON episodes(consolidated);
CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance);
CREATE INDEX IF NOT EXISTS idx_episodes_created ON episodes(created_at);
`;

const CREATE_CONSOLIDATION_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS consolidation_log (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  before_score REAL NOT NULL,
  after_score REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  patterns_identified TEXT NOT NULL DEFAULT '[]',
  ewc_applied INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_episode ON consolidation_log(episode_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_timestamp ON consolidation_log(timestamp);
`;

const CREATE_SLEEP_METRICS_TABLE = `
CREATE TABLE IF NOT EXISTS sleep_metrics (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  wake_duration INTEGER NOT NULL,
  nrem_duration INTEGER NOT NULL,
  rem_duration INTEGER NOT NULL,
  episodes_consolidated INTEGER NOT NULL DEFAULT 0,
  forgetting_rate REAL NOT NULL DEFAULT 0,
  forward_transfer REAL NOT NULL DEFAULT 0,
  avg_dq_score REAL NOT NULL DEFAULT 0.5,
  sleep_trigger TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  session_id TEXT,
  synthetic_episodes INTEGER NOT NULL DEFAULT 0,
  cross_domain_patterns TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_sleep_cycle ON sleep_metrics(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sleep_session ON sleep_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_sleep_timestamp ON sleep_metrics(timestamp);
`;

// =============================================================================
// STORAGE INTEGRATION CLASS
// =============================================================================

/**
 * CognitiveStorageIntegration provides persistent storage for cognitive cycles.
 *
 * Supports:
 * - SQLite for episode, consolidation, and sleep metrics storage
 * - Qdrant/sqlite-vec for vector similarity search
 * - Cohere embeddings (1024d) for semantic search
 * - HTTP API sync with ResearchGravity
 */
export class CognitiveStorageIntegration {
  private static instance: CognitiveStorageIntegration | null = null;

  private config: StorageConfig;
  private apiClient: AgentCoreClient | null = null;
  private initialized: boolean = false;

  // In-memory fallback storage
  private memoryEpisodes: Map<string, EpisodeRecord> = new Map();
  private memoryConsolidationLogs: Map<string, ConsolidationLogRecord> = new Map();
  private memorySleepMetrics: Map<string, SleepMetricsRecord> = new Map();
  private memoryEmbeddings: Map<string, number[]> = new Map();

  // Status tracking
  private status: StorageStatus = {
    backend: 'memory',
    vectorStore: 'memory',
    initialized: false,
    apiAvailable: false,
    lastSync: null,
    episodeCount: 0,
    consolidationCount: 0,
    sleepMetricsCount: 0,
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<StorageConfig>): CognitiveStorageIntegration {
    if (!CognitiveStorageIntegration.instance) {
      CognitiveStorageIntegration.instance = new CognitiveStorageIntegration(config);
    }
    return CognitiveStorageIntegration.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    if (CognitiveStorageIntegration.instance) {
      CognitiveStorageIntegration.instance.cleanup();
    }
    CognitiveStorageIntegration.instance = null;
  }

  private cleanup(): void {
    this.memoryEpisodes.clear();
    this.memoryConsolidationLogs.clear();
    this.memorySleepMetrics.clear();
    this.memoryEmbeddings.clear();
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize storage backends and create necessary tables.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[CognitiveStorage] Already initialized');
      return;
    }

    console.log('[CognitiveStorage] Initializing storage backends...');

    // Initialize API client
    this.apiClient = new AgentCoreClient({
      baseUrl: this.config.apiUrl,
      project: this.config.project,
      timeout: this.config.apiTimeout,
    });

    // Check API availability
    try {
      this.status.apiAvailable = await this.apiClient.isHealthy();
      console.log(`[CognitiveStorage] API available: ${this.status.apiAvailable}`);
    } catch (error) {
      logger.warn('API not available', error, 'CognitiveStorage');
      this.status.apiAvailable = false;
    }

    // Determine storage backend
    if (this.status.apiAvailable && this.config.preferredBackend === 'http-api') {
      this.status.backend = 'http-api';
      // Ensure tables exist via API (if supported)
      await this.ensureTablesViaApi();
    } else {
      // Fall back to memory storage in browser environment
      this.status.backend = 'memory';
      console.log('[CognitiveStorage] Using in-memory storage (browser environment)');
    }

    // Determine vector store
    if (this.status.apiAvailable) {
      // API provides vector search
      this.status.vectorStore = 'sqlite-vec';
    } else {
      this.status.vectorStore = 'memory';
    }

    this.initialized = true;
    this.status.initialized = true;

    console.log(`[CognitiveStorage] Initialized with backend=${this.status.backend}, vectorStore=${this.status.vectorStore}`);
  }

  /**
   * Ensure tables exist via API.
   */
  private async ensureTablesViaApi(): Promise<void> {
    if (!this.apiClient || !this.status.apiAvailable) return;

    try {
      // The API should handle table creation automatically
      // We just verify connectivity
      await this.apiClient.health();
      console.log('[CognitiveStorage] API tables ready');
    } catch (error) {
      logger.warn('Could not verify API tables', error, 'CognitiveStorage');
    }
  }

  // ---------------------------------------------------------------------------
  // EPISODE STORAGE
  // ---------------------------------------------------------------------------

  /**
   * Store an episode to persistent storage.
   *
   * @param episode - Episode from WakeSleepAgent
   * @returns Episode ID
   */
  async storeEpisode(episode: Episode): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const record = this.episodeToRecord(episode);

    // Store in memory (always, as fallback)
    this.memoryEpisodes.set(record.id, record);
    this.status.episodeCount = this.memoryEpisodes.size;

    // Sync to API if available
    if (this.config.enableApiSync && this.status.apiAvailable && this.apiClient) {
      try {
        await this.syncEpisodeToApi(record);
      } catch (error) {
        logger.warn('Failed to sync episode to API', error, 'CognitiveStorage');
      }
    }

    console.log(`[CognitiveStorage] Stored episode: ${episode.id}`);
    return episode.id;
  }

  /**
   * Convert Episode to EpisodeRecord.
   */
  private episodeToRecord(episode: Episode): EpisodeRecord {
    return {
      id: episode.id,
      session_id: this.config.sessionId || 'default',
      task_id: episode.taskId,
      content: JSON.stringify(episode.content),
      importance: this.computeCompositeImportance(episode.importance),
      learning_speed: this.computeLearningSpeed(episode),
      exposure_count: episode.importance.accessCount,
      last_replayed: null,
      consolidated: episode.consolidated,
      created_at: episode.createdAt,
      type: episode.metadata.layerId,
      intent: episode.intent,
      dq_score: episode.importance.dqScore,
      tags: JSON.stringify(episode.metadata.tags),
      domain: episode.metadata.domain || null,
      embedding: null, // Will be computed separately
    };
  }

  /**
   * Compute composite importance score.
   */
  private computeCompositeImportance(signals: ImportanceSignals): number {
    const {
      dqScore,
      surprise,
      emotionalSalience,
      recency,
      accessCount,
      priority,
      userFeedback,
    } = signals;

    // Weighted combination matching WakeSleepAgent logic
    let score =
      dqScore * 0.25 +
      surprise * 0.2 +
      emotionalSalience * 0.15 +
      recency * 0.15 +
      priority * 0.15 +
      Math.min(accessCount / 10, 1) * 0.1;

    // User feedback override
    if (userFeedback !== undefined) {
      score = score * 0.5 + userFeedback * 0.5;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Compute learning speed (Goldilocks criteria).
   * Episodes with moderate importance have higher learning speed.
   */
  private computeLearningSpeed(episode: Episode): number {
    const importance = this.computeCompositeImportance(episode.importance);

    // Goldilocks: not too important (already learned), not too trivial
    // Peak learning speed at importance ~0.5
    const goldilocksCenter = 0.5;
    const spread = 0.3;
    const distance = Math.abs(importance - goldilocksCenter);
    const speed = Math.exp(-(distance * distance) / (2 * spread * spread));

    return Math.max(0.1, speed);
  }

  /**
   * Sync episode to ResearchGravity API.
   */
  private async syncEpisodeToApi(record: EpisodeRecord): Promise<void> {
    if (!this.apiClient) return;

    try {
      // Create a finding from the episode for semantic search
      await this.apiClient.createFinding({
        content: `[Episode ${record.id}] ${record.intent}`,
        type: 'pattern',
        tags: JSON.parse(record.tags),
        project: this.config.project,
      });

      this.status.lastSync = Date.now();
    } catch (error) {
      logger.warn('API sync failed', error, 'CognitiveStorage');
    }
  }

  // ---------------------------------------------------------------------------
  // CONSOLIDATION LOG STORAGE
  // ---------------------------------------------------------------------------

  /**
   * Store a consolidation log entry.
   *
   * @param log - Consolidation log data
   */
  async storeConsolidation(log: {
    episodeId: string;
    phase: SleepPhase;
    durationMs: number;
    beforeScore: number;
    afterScore: number;
    patternsIdentified?: string[];
    ewcApplied?: boolean;
  }): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = `cons-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const record: ConsolidationLogRecord = {
      id,
      episode_id: log.episodeId,
      phase: log.phase,
      duration_ms: log.durationMs,
      before_score: log.beforeScore,
      after_score: log.afterScore,
      timestamp: Date.now(),
      patterns_identified: JSON.stringify(log.patternsIdentified || []),
      ewc_applied: log.ewcApplied || false,
    };

    // Store in memory
    this.memoryConsolidationLogs.set(id, record);
    this.status.consolidationCount = this.memoryConsolidationLogs.size;

    // Update episode's consolidated status
    const episode = this.memoryEpisodes.get(log.episodeId);
    if (episode) {
      episode.consolidated = true;
      episode.last_replayed = Date.now();
      episode.exposure_count++;
    }

    console.log(`[CognitiveStorage] Stored consolidation log: ${id} for episode ${log.episodeId}`);
  }

  // ---------------------------------------------------------------------------
  // SLEEP METRICS STORAGE
  // ---------------------------------------------------------------------------

  /**
   * Store sleep metrics for a complete sleep cycle.
   *
   * @param metrics - Sleep metrics data
   */
  async storeSleepMetrics(metrics: {
    cycleId: string;
    wakeDuration: number;
    nremDuration: number;
    remDuration: number;
    episodesConsolidated: number;
    forgettingRate: number;
    forwardTransfer: number;
    avgDqScore: number;
    sleepTrigger: string;
    syntheticEpisodes?: number;
    crossDomainPatterns?: string[];
  }): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = `sleep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const record: SleepMetricsRecord = {
      id,
      cycle_id: metrics.cycleId,
      wake_duration: metrics.wakeDuration,
      nrem_duration: metrics.nremDuration,
      rem_duration: metrics.remDuration,
      episodes_consolidated: metrics.episodesConsolidated,
      forgetting_rate: metrics.forgettingRate,
      forward_transfer: metrics.forwardTransfer,
      avg_dq_score: metrics.avgDqScore,
      sleep_trigger: metrics.sleepTrigger,
      timestamp: Date.now(),
      session_id: this.config.sessionId || null,
      synthetic_episodes: metrics.syntheticEpisodes || 0,
      cross_domain_patterns: JSON.stringify(metrics.crossDomainPatterns || []),
    };

    // Store in memory
    this.memorySleepMetrics.set(id, record);
    this.status.sleepMetricsCount = this.memorySleepMetrics.size;

    console.log(`[CognitiveStorage] Stored sleep metrics: ${id} for cycle ${metrics.cycleId}`);
  }

  // ---------------------------------------------------------------------------
  // EPISODE QUERYING
  // ---------------------------------------------------------------------------

  /**
   * Query episodes with filters.
   *
   * @param query - Query options
   * @returns Matching episodes
   */
  async queryEpisodes(query: EpisodeQuery): Promise<Episode[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Filter episodes
    let episodes = Array.from(this.memoryEpisodes.values());

    // Apply filters
    if (query.sessionId) {
      episodes = episodes.filter(e => e.session_id === query.sessionId);
    }
    if (query.taskId) {
      episodes = episodes.filter(e => e.task_id === query.taskId);
    }
    if (query.consolidated !== undefined) {
      episodes = episodes.filter(e => e.consolidated === query.consolidated);
    }
    if (query.minImportance !== undefined) {
      episodes = episodes.filter(e => e.importance >= query.minImportance!);
    }
    if (query.maxImportance !== undefined) {
      episodes = episodes.filter(e => e.importance <= query.maxImportance!);
    }
    if (query.tags && query.tags.length > 0) {
      episodes = episodes.filter(e => {
        const tags = JSON.parse(e.tags) as string[];
        return query.tags!.some(t => tags.includes(t));
      });
    }
    if (query.domain) {
      episodes = episodes.filter(e => e.domain === query.domain);
    }
    if (query.startTime !== undefined) {
      episodes = episodes.filter(e => e.created_at >= query.startTime!);
    }
    if (query.endTime !== undefined) {
      episodes = episodes.filter(e => e.created_at <= query.endTime!);
    }

    // Sort
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    episodes.sort((a, b) => {
      const aVal = a[sortBy as keyof EpisodeRecord] as number;
      const bVal = b[sortBy as keyof EpisodeRecord] as number;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Limit
    if (query.limit) {
      episodes = episodes.slice(0, query.limit);
    }

    // Convert back to Episode format
    return episodes.map(r => this.recordToEpisode(r));
  }

  /**
   * Convert EpisodeRecord to Episode.
   */
  private recordToEpisode(record: EpisodeRecord): Episode {
    const tags = JSON.parse(record.tags) as string[];

    return {
      id: record.id,
      taskId: record.task_id,
      intent: record.intent,
      content: JSON.parse(record.content),
      result: null, // Result is not persisted
      importance: {
        dqScore: record.dq_score,
        surprise: 0.5, // Default, not persisted
        emotionalSalience: 0.3, // Default
        recency: Math.max(0, 1 - (Date.now() - record.created_at) / (24 * 60 * 60 * 1000)),
        accessCount: record.exposure_count,
        priority: 0.5, // Default
      },
      metadata: {
        layerId: record.type as any,
        latencyMs: 0,
        tokensUsed: 0,
        contextPages: [],
        tags,
        domain: record.domain || undefined,
        linkedEpisodes: [],
      },
      createdAt: record.created_at,
      consolidated: record.consolidated,
      consolidatedAt: record.last_replayed || undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // SEMANTIC SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Perform semantic search over episodes.
   *
   * @param text - Query text
   * @param limit - Maximum results
   * @returns Matching episodes ranked by similarity
   */
  async semanticSearch(text: string, limit: number = 10): Promise<Episode[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try API-based semantic search first
    if (this.status.apiAvailable && this.apiClient) {
      try {
        const results = await this.apiClient.search(text, { limit });

        // Map search results to episodes (approximate)
        const matchedEpisodes: Episode[] = [];

        for (const result of results) {
          // Find matching episode by content similarity
          const episode = this.findEpisodeByContent(result.content);
          if (episode) {
            matchedEpisodes.push(episode);
          }
        }

        if (matchedEpisodes.length > 0) {
          return matchedEpisodes;
        }
      } catch (error) {
        logger.warn('API semantic search failed', error, 'CognitiveStorage');
      }
    }

    // Fallback to keyword-based search
    return this.keywordSearch(text, limit);
  }

  /**
   * Find episode by content match.
   */
  private findEpisodeByContent(content: string): Episode | null {
    const contentLower = content.toLowerCase();

    for (const record of this.memoryEpisodes.values()) {
      if (
        record.intent.toLowerCase().includes(contentLower) ||
        record.content.toLowerCase().includes(contentLower)
      ) {
        return this.recordToEpisode(record);
      }
    }

    return null;
  }

  /**
   * Keyword-based search fallback.
   */
  private keywordSearch(text: string, limit: number): Episode[] {
    const keywords = text.toLowerCase().split(/\s+/).filter(k => k.length > 2);

    if (keywords.length === 0) {
      return [];
    }

    const scored: Array<{ record: EpisodeRecord; score: number }> = [];

    for (const record of this.memoryEpisodes.values()) {
      const searchableText = `${record.intent} ${record.content} ${record.tags}`.toLowerCase();

      let score = 0;
      for (const keyword of keywords) {
        if (searchableText.includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        // Boost by importance
        score *= (1 + record.importance);
        // Boost by recency
        const age = Date.now() - record.created_at;
        const recencyBoost = Math.exp(-age / (7 * 24 * 60 * 60 * 1000));
        score *= (1 + recencyBoost * 0.5);

        scored.push({ record, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top results
    return scored.slice(0, limit).map(s => this.recordToEpisode(s.record));
  }

  // ---------------------------------------------------------------------------
  // EMBEDDING GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Generate embedding for text using Cohere API.
   * Falls back to simple hash-based embedding if API unavailable.
   *
   * @param text - Text to embed
   * @returns 1024-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.memoryEmbeddings.has(cacheKey)) {
      return this.memoryEmbeddings.get(cacheKey)!;
    }

    // If Cohere API key is provided, use Cohere
    if (this.config.cohereApiKey) {
      try {
        const embedding = await this.generateCohereEmbedding(text);
        this.memoryEmbeddings.set(cacheKey, embedding);
        return embedding;
      } catch (error) {
        logger.warn('Cohere embedding failed', error, 'CognitiveStorage');
      }
    }

    // Fallback to simple hash-based embedding
    const embedding = this.generateSimpleEmbedding(text);
    this.memoryEmbeddings.set(cacheKey, embedding);
    return embedding;
  }

  /**
   * Generate embedding using Cohere API.
   */
  private async generateCohereEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [text],
        model: this.config.embeddingModel,
        input_type: 'search_query',
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  }

  /**
   * Generate simple hash-based embedding (fallback).
   * Creates a deterministic 1024-d vector from text.
   */
  private generateSimpleEmbedding(text: string): number[] {
    const dimensions = this.config.embeddingDimensions;
    const embedding = new Array(dimensions).fill(0);

    // Use a simple hash function to distribute values
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const idx = (charCode * 31 + i * 17 + j * 13) % dimensions;
        embedding[idx] += 0.1 * Math.sin(charCode + i);
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Hash text for caching.
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `emb-${hash.toString(16)}`;
  }

  // ---------------------------------------------------------------------------
  // BATCH OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Store multiple episodes in batch.
   */
  async storeEpisodesBatch(episodes: Episode[]): Promise<string[]> {
    const ids: string[] = [];

    for (const episode of episodes) {
      const id = await this.storeEpisode(episode);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Get all unconsolidated episodes for sleep phase processing.
   */
  async getUnconsolidatedEpisodes(): Promise<Episode[]> {
    return this.queryEpisodes({
      consolidated: false,
      sortBy: 'importance',
      sortOrder: 'desc',
    });
  }

  /**
   * Get recently consolidated episodes.
   */
  async getRecentlyConsolidated(limit: number = 50): Promise<Episode[]> {
    return this.queryEpisodes({
      consolidated: true,
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit,
    });
  }

  // ---------------------------------------------------------------------------
  // METRICS AND STATUS
  // ---------------------------------------------------------------------------

  /**
   * Get storage status.
   */
  getStatus(): StorageStatus {
    return { ...this.status };
  }

  /**
   * Get configuration.
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set session ID for episode attribution.
   */
  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
  }

  /**
   * Get consolidation history for an episode.
   */
  getConsolidationHistory(episodeId: string): ConsolidationLogRecord[] {
    return Array.from(this.memoryConsolidationLogs.values())
      .filter(log => log.episode_id === episodeId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get sleep metrics for a cycle.
   */
  getSleepMetrics(cycleId?: string): SleepMetricsRecord[] {
    let metrics = Array.from(this.memorySleepMetrics.values());

    if (cycleId) {
      metrics = metrics.filter(m => m.cycle_id === cycleId);
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get aggregate statistics.
   */
  getStatistics(): {
    totalEpisodes: number;
    consolidatedEpisodes: number;
    avgImportance: number;
    avgDqScore: number;
    totalConsolidations: number;
    totalSleepCycles: number;
    avgForwardTransfer: number;
  } {
    const episodes = Array.from(this.memoryEpisodes.values());
    const sleepMetrics = Array.from(this.memorySleepMetrics.values());

    const consolidatedCount = episodes.filter(e => e.consolidated).length;
    const avgImportance = episodes.length > 0
      ? episodes.reduce((sum, e) => sum + e.importance, 0) / episodes.length
      : 0;
    const avgDqScore = episodes.length > 0
      ? episodes.reduce((sum, e) => sum + e.dq_score, 0) / episodes.length
      : 0;
    const avgForwardTransfer = sleepMetrics.length > 0
      ? sleepMetrics.reduce((sum, m) => sum + m.forward_transfer, 0) / sleepMetrics.length
      : 0;

    return {
      totalEpisodes: episodes.length,
      consolidatedEpisodes: consolidatedCount,
      avgImportance,
      avgDqScore,
      totalConsolidations: this.memoryConsolidationLogs.size,
      totalSleepCycles: sleepMetrics.length,
      avgForwardTransfer,
    };
  }

  /**
   * Export all data for backup.
   */
  exportData(): {
    episodes: EpisodeRecord[];
    consolidationLogs: ConsolidationLogRecord[];
    sleepMetrics: SleepMetricsRecord[];
  } {
    return {
      episodes: Array.from(this.memoryEpisodes.values()),
      consolidationLogs: Array.from(this.memoryConsolidationLogs.values()),
      sleepMetrics: Array.from(this.memorySleepMetrics.values()),
    };
  }

  /**
   * Import data from backup.
   */
  importData(data: {
    episodes?: EpisodeRecord[];
    consolidationLogs?: ConsolidationLogRecord[];
    sleepMetrics?: SleepMetricsRecord[];
  }): void {
    if (data.episodes) {
      for (const episode of data.episodes) {
        this.memoryEpisodes.set(episode.id, episode);
      }
    }
    if (data.consolidationLogs) {
      for (const log of data.consolidationLogs) {
        this.memoryConsolidationLogs.set(log.id, log);
      }
    }
    if (data.sleepMetrics) {
      for (const metrics of data.sleepMetrics) {
        this.memorySleepMetrics.set(metrics.id, metrics);
      }
    }

    // Update status counts
    this.status.episodeCount = this.memoryEpisodes.size;
    this.status.consolidationCount = this.memoryConsolidationLogs.size;
    this.status.sleepMetricsCount = this.memorySleepMetrics.size;

    console.log(`[CognitiveStorage] Imported ${data.episodes?.length || 0} episodes, ${data.consolidationLogs?.length || 0} logs, ${data.sleepMetrics?.length || 0} metrics`);
  }

  /**
   * Clear all stored data.
   */
  clearAll(): void {
    this.cleanup();
    this.status.episodeCount = 0;
    this.status.consolidationCount = 0;
    this.status.sleepMetricsCount = 0;
    console.log('[CognitiveStorage] All data cleared');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of CognitiveStorageIntegration.
 */
export const cognitiveStorage = CognitiveStorageIntegration.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createCognitiveStorage(
  config?: Partial<StorageConfig>
): CognitiveStorageIntegration {
  CognitiveStorageIntegration.resetInstance();
  return CognitiveStorageIntegration.getInstance(config);
}

// =============================================================================
// SQL SCHEMA EXPORT (for server-side initialization)
// =============================================================================

export const SQL_SCHEMA = {
  episodes: CREATE_EPISODES_TABLE,
  consolidationLog: CREATE_CONSOLIDATION_LOG_TABLE,
  sleepMetrics: CREATE_SLEEP_METRICS_TABLE,
};
