/**
 * SimpleMem 3-Stage Pipeline - US-010
 *
 * Implements a high-performance memory construction pipeline targeting 14x faster
 * memory operations through semantic compression, online synthesis, and intent-aware
 * retrieval.
 *
 * Three stages:
 * 1. Semantic Structured Compression - Extract entities/relations, build indices
 * 2. Online Semantic Synthesis - Merge compatible episodes during write
 * 3. Intent-Aware Retrieval Planning - Optimal index selection and early termination
 *
 * Research basis:
 * - arXiv:2601.02553 (SimpleMem) - 14x speedup via 3-stage pipeline
 * - arXiv:2512.23880 (CASCADE) - Semantic chunking strategies
 * - arXiv:2506.15672 (SwarmAgentic) - Episode consolidation patterns
 */

import type { DQScore } from '../../archon/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Raw episode before compression.
 */
export interface RawEpisode {
  /** Unique episode identifier */
  id: string;

  /** Raw content (text, structured data, etc.) */
  content: string;

  /** Episode type for categorization */
  type: EpisodeType;

  /** Source of the episode */
  source: EpisodeSource;

  /** Timestamp of creation */
  timestamp: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;

  /** Optional context from biometrics or MCP */
  context?: EpisodeContext;
}

/**
 * Episode types for categorization.
 */
export type EpisodeType =
  | 'interaction'    // User interaction
  | 'observation'    // System observation
  | 'decision'       // Decision made
  | 'outcome'        // Task outcome
  | 'learning'       // Learned pattern
  | 'reflection';    // Self-reflection

/**
 * Episode sources.
 */
export type EpisodeSource =
  | 'user'           // Direct user input
  | 'agent'          // Agent-generated
  | 'system'         // System event
  | 'external';      // External data

/**
 * Additional context for episodes.
 */
export interface EpisodeContext {
  /** Biometric state at time of episode */
  biometricState?: {
    stressLevel: number;
    focusScore: number;
    activityLevel: number;
  };

  /** Active MCP context packs */
  mcpPacks?: string[];

  /** Task context if part of a task */
  taskId?: string;

  /** Session identifier */
  sessionId?: string;
}

/**
 * Semantic entity extracted from content.
 */
export interface SemanticEntity {
  /** Entity identifier */
  id: string;

  /** Entity name/label */
  name: string;

  /** Entity type (person, concept, action, etc.) */
  type: EntityType;

  /** Importance score (0-1) */
  importance: number;

  /** Embedding vector (optional, for similarity) */
  embedding?: number[];

  /** Source episodes */
  sourceEpisodes: string[];
}

/**
 * Entity types.
 */
export type EntityType =
  | 'person'
  | 'concept'
  | 'action'
  | 'object'
  | 'event'
  | 'location'
  | 'time'
  | 'relation';

/**
 * Semantic relation between entities.
 */
export interface SemanticRelation {
  /** Source entity ID */
  sourceId: string;

  /** Target entity ID */
  targetId: string;

  /** Relation type */
  type: RelationType;

  /** Relation strength (0-1) */
  strength: number;

  /** Evidence from source episodes */
  evidence: string[];
}

/**
 * Relation types.
 */
export type RelationType =
  | 'causes'
  | 'enables'
  | 'blocks'
  | 'similar_to'
  | 'part_of'
  | 'related_to'
  | 'temporal_before'
  | 'temporal_after'
  | 'depends_on';

/**
 * Compressed episode after Stage 1.
 */
export interface CompressedEpisode {
  /** Original episode ID */
  id: string;

  /** Original episode type */
  type: EpisodeType;

  /** Compression timestamp */
  compressedAt: number;

  /** Extracted entities */
  entities: SemanticEntity[];

  /** Extracted relations */
  relations: SemanticRelation[];

  /** Semantic summary (compressed text) */
  summary: string;

  /** Key concepts (for indexing) */
  concepts: string[];

  /** Temporal markers */
  temporal: {
    start: number;
    end?: number;
    duration?: number;
  };

  /** Causal chain identifiers */
  causalChains: string[];

  /** Compression ratio achieved */
  compressionRatio: number;

  /** Quality score of compression */
  qualityScore: number;
}

/**
 * Consolidated memory after Stage 2 synthesis.
 */
export interface ConsolidatedMemory {
  /** Memory cluster ID */
  clusterId: string;

  /** Component episode IDs */
  episodeIds: string[];

  /** Merged entities (deduplicated) */
  entities: SemanticEntity[];

  /** Merged relations (strengthened) */
  relations: SemanticRelation[];

  /** Unified summary */
  summary: string;

  /** Unified concepts */
  concepts: string[];

  /** Consolidation metadata */
  consolidation: {
    mergeCount: number;
    overlapScore: number;
    coherenceScore: number;
    consolidatedAt: number;
  };

  /** Importance for forgetting curve */
  importance: number;

  /** Last access time */
  lastAccessed: number;

  /** Access count */
  accessCount: number;
}

/**
 * Retrieval query for Stage 3.
 */
export interface RetrievalQuery {
  /** Query text or embedding */
  query: string;

  /** Optional embedding vector */
  embedding?: number[];

  /** Filter by episode types */
  types?: EpisodeType[];

  /** Time range filter */
  timeRange?: {
    start?: number;
    end?: number;
  };

  /** Maximum results */
  limit: number;

  /** Minimum relevance threshold */
  minRelevance?: number;
}

/**
 * Retrieval intent for planning.
 */
export interface RetrievalIntent {
  /** Primary intent type */
  type: IntentType;

  /** Urgency level (affects early termination) */
  urgency: 'low' | 'normal' | 'high' | 'critical';

  /** Depth preference */
  depth: 'shallow' | 'moderate' | 'deep';

  /** Breadth preference */
  breadth: 'narrow' | 'moderate' | 'wide';

  /** Context requirements */
  contextNeeded: boolean;
}

/**
 * Intent types for retrieval planning.
 */
export type IntentType =
  | 'recall'         // Exact memory recall
  | 'associate'      // Find related memories
  | 'pattern'        // Pattern matching
  | 'causal'         // Causal chain traversal
  | 'temporal'       // Time-based retrieval
  | 'semantic';      // Semantic similarity

/**
 * Ranked episodes result from retrieval.
 */
export interface RankedEpisodes {
  /** Retrieved episodes/memories */
  results: RetrievalResult[];

  /** Retrieval metadata */
  metadata: {
    queryTime: number;
    indexUsed: IndexType;
    strategy: RetrievalStrategy;
    earlyTerminated: boolean;
    candidatesScanned: number;
    resultsReturned: number;
  };

  /** Quality assessment */
  quality: DQScore;
}

/**
 * Individual retrieval result.
 */
export interface RetrievalResult {
  /** Memory ID (episode or consolidated) */
  id: string;

  /** Whether this is a consolidated memory */
  isConsolidated: boolean;

  /** Relevance score */
  relevance: number;

  /** Match type */
  matchType: 'exact' | 'semantic' | 'causal' | 'temporal';

  /** Summary for display */
  summary: string;

  /** Source entities matched */
  matchedEntities: string[];

  /** Full content (if requested) */
  content?: CompressedEpisode | ConsolidatedMemory;
}

/**
 * Index types for retrieval planning.
 */
export type IndexType =
  | 'temporal'       // Time-ordered index
  | 'semantic'       // Embedding-based index
  | 'causal'         // Causal chain index
  | 'entity'         // Entity-centric index
  | 'concept';       // Concept-based index

/**
 * Retrieval strategy.
 */
export type RetrievalStrategy =
  | 'breadth_first'  // Wide, shallow search
  | 'depth_first'    // Deep, narrow search
  | 'hybrid'         // Balanced approach
  | 'adaptive';      // Dynamic adjustment

/**
 * SimpleMem metrics.
 */
export interface SimpleMemMetrics {
  /** Stage 1 metrics */
  compression: {
    episodesProcessed: number;
    avgCompressionRatio: number;
    avgProcessingTime: number;
    entitiesExtracted: number;
    relationsExtracted: number;
  };

  /** Stage 2 metrics */
  synthesis: {
    mergesPerformed: number;
    avgOverlapScore: number;
    avgCoherenceScore: number;
    consolidatedMemories: number;
  };

  /** Stage 3 metrics */
  retrieval: {
    queriesProcessed: number;
    avgQueryTime: number;
    avgResultsReturned: number;
    earlyTerminations: number;
    indexDistribution: Map<IndexType, number>;
  };

  /** Overall metrics */
  overall: {
    totalEpisodes: number;
    totalMemories: number;
    storageEfficiency: number;
    avgDqScore: number;
  };
}

/**
 * SimpleMem configuration.
 */
export interface SimpleMemConfig {
  /** Compression settings */
  compression: {
    minEntityImportance: number;
    maxEntitiesPerEpisode: number;
    maxRelationsPerEpisode: number;
    summaryMaxLength: number;
  };

  /** Synthesis settings */
  synthesis: {
    overlapThreshold: number;
    maxEpisodesPerCluster: number;
    coherenceThreshold: number;
    enableAutoMerge: boolean;
  };

  /** Retrieval settings */
  retrieval: {
    defaultLimit: number;
    earlyTerminationThreshold: number;
    maxCandidates: number;
    minRelevanceDefault: number;
  };

  /** Memory management */
  memory: {
    maxEpisodes: number;
    maxConsolidated: number;
    forgettingEnabled: boolean;
    forgettingRate: number;
  };
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: SimpleMemConfig = {
  compression: {
    minEntityImportance: 0.3,
    maxEntitiesPerEpisode: 20,
    maxRelationsPerEpisode: 30,
    summaryMaxLength: 500,
  },
  synthesis: {
    overlapThreshold: 0.5,
    maxEpisodesPerCluster: 10,
    coherenceThreshold: 0.6,
    enableAutoMerge: true,
  },
  retrieval: {
    defaultLimit: 10,
    earlyTerminationThreshold: 0.9,
    maxCandidates: 100,
    minRelevanceDefault: 0.3,
  },
  memory: {
    maxEpisodes: 10000,
    maxConsolidated: 1000,
    forgettingEnabled: true,
    forgettingRate: 0.01,
  },
};

// =============================================================================
// SIMPLEMEM CLASS
// =============================================================================

/**
 * SimpleMem implements a 3-stage memory pipeline for high-performance
 * episode storage and retrieval.
 *
 * Targeting 14x faster memory construction through:
 * - Semantic structured compression (Stage 1)
 * - Online semantic synthesis (Stage 2)
 * - Intent-aware retrieval planning (Stage 3)
 */
export class SimpleMem {
  private static instance: SimpleMem | null = null;

  private config: SimpleMemConfig;

  // Storage
  private episodes: Map<string, CompressedEpisode> = new Map();
  private memories: Map<string, ConsolidatedMemory> = new Map();

  // Indices (Stage 3 optimization)
  private temporalIndex: Map<number, string[]> = new Map(); // timestamp bucket -> episode IDs
  private semanticIndex: Map<string, string[]> = new Map(); // concept -> episode IDs
  private causalIndex: Map<string, string[]> = new Map();   // causal chain -> episode IDs
  private entityIndex: Map<string, string[]> = new Map();   // entity ID -> episode IDs

  // Episode graph for synthesis (Stage 2)
  private episodeGraph: Map<string, Set<string>> = new Map(); // episode ID -> related episode IDs

  // Metrics
  private metrics: SimpleMemMetrics = {
    compression: {
      episodesProcessed: 0,
      avgCompressionRatio: 0,
      avgProcessingTime: 0,
      entitiesExtracted: 0,
      relationsExtracted: 0,
    },
    synthesis: {
      mergesPerformed: 0,
      avgOverlapScore: 0,
      avgCoherenceScore: 0,
      consolidatedMemories: 0,
    },
    retrieval: {
      queriesProcessed: 0,
      avgQueryTime: 0,
      avgResultsReturned: 0,
      earlyTerminations: 0,
      indexDistribution: new Map(),
    },
    overall: {
      totalEpisodes: 0,
      totalMemories: 0,
      storageEfficiency: 1.0,
      avgDqScore: 0.8,
    },
  };

  // ---------------------------------------------------------------------------
  // Singleton Pattern
  // ---------------------------------------------------------------------------

  private constructor(config: Partial<SimpleMemConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: Partial<SimpleMemConfig>): SimpleMem {
    if (!SimpleMem.instance) {
      SimpleMem.instance = new SimpleMem(config);
    }
    return SimpleMem.instance;
  }

  /**
   * Reset singleton (for testing).
   */
  static resetInstance(): void {
    SimpleMem.instance = null;
  }

  private mergeConfig(
    defaults: SimpleMemConfig,
    overrides: Partial<SimpleMemConfig>
  ): SimpleMemConfig {
    return {
      compression: { ...defaults.compression, ...overrides.compression },
      synthesis: { ...defaults.synthesis, ...overrides.synthesis },
      retrieval: { ...defaults.retrieval, ...overrides.retrieval },
      memory: { ...defaults.memory, ...overrides.memory },
    };
  }

  // ---------------------------------------------------------------------------
  // Stage 1: Semantic Structured Compression
  // ---------------------------------------------------------------------------

  /**
   * Compress a raw episode into a structured representation.
   *
   * Extracts:
   * - Semantic entities (named entities, concepts, actions)
   * - Relations between entities
   * - Multi-view indices (temporal, semantic, causal)
   * - Compressed summary
   *
   * @param episode - Raw episode to compress
   * @returns Compressed episode with semantic structure
   */
  compress(episode: RawEpisode): CompressedEpisode {
    const startTime = performance.now();

    // Extract semantic chunks
    const entities = this.extractEntities(episode);
    const relations = this.extractRelations(episode, entities);

    // Generate compressed summary
    const summary = this.generateSummary(episode, entities);

    // Extract key concepts for indexing
    const concepts = this.extractConcepts(episode, entities);

    // Identify causal chains
    const causalChains = this.identifyCausalChains(episode, relations);

    // Calculate compression metrics
    const originalSize = episode.content.length;
    const compressedSize = summary.length + JSON.stringify(entities).length * 0.1;
    const compressionRatio = originalSize / Math.max(1, compressedSize);

    // Quality score based on extraction completeness
    const qualityScore = this.computeCompressionQuality(
      entities,
      relations,
      episode
    );

    const compressed: CompressedEpisode = {
      id: episode.id,
      type: episode.type,
      compressedAt: Date.now(),
      entities,
      relations,
      summary,
      concepts,
      temporal: {
        start: episode.timestamp,
        end: episode.metadata?.endTime as number | undefined,
        duration: episode.metadata?.duration as number | undefined,
      },
      causalChains,
      compressionRatio,
      qualityScore,
    };

    // Update metrics
    const processingTime = performance.now() - startTime;
    this.updateCompressionMetrics(compressed, processingTime);

    return compressed;
  }

  private extractEntities(episode: RawEpisode): SemanticEntity[] {
    const entities: SemanticEntity[] = [];
    const content = episode.content.toLowerCase();

    // Pattern-based entity extraction
    const patterns: Array<{ regex: RegExp; type: EntityType }> = [
      // Actions (verbs)
      { regex: /\b(create|update|delete|search|analyze|generate|process|run|execute|build)\b/gi, type: 'action' },
      // Concepts (technical terms)
      { regex: /\b(memory|episode|agent|task|query|index|synthesis|compression|retrieval)\b/gi, type: 'concept' },
      // Events
      { regex: /\b(started|completed|failed|triggered|initiated|finished)\b/gi, type: 'event' },
      // Time references
      { regex: /\b(now|today|yesterday|earlier|later|before|after)\b/gi, type: 'time' },
    ];

    const seenNames = new Set<string>();

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const name = match[1].toLowerCase();
        if (!seenNames.has(name)) {
          seenNames.add(name);
          entities.push({
            id: `entity-${episode.id}-${entities.length}`,
            name,
            type,
            importance: this.computeEntityImportance(name, content, type),
            sourceEpisodes: [episode.id],
          });
        }
      }
    }

    // Extract noun phrases as concepts/objects
    const nounPhrases = this.extractNounPhrases(episode.content);
    for (const phrase of nounPhrases) {
      if (!seenNames.has(phrase.toLowerCase())) {
        seenNames.add(phrase.toLowerCase());
        entities.push({
          id: `entity-${episode.id}-${entities.length}`,
          name: phrase,
          type: 'concept',
          importance: this.computeEntityImportance(phrase, content, 'concept'),
          sourceEpisodes: [episode.id],
        });
      }
    }

    // Filter by importance and limit
    return entities
      .filter((e) => e.importance >= this.config.compression.minEntityImportance)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, this.config.compression.maxEntitiesPerEpisode);
  }

  private extractNounPhrases(content: string): string[] {
    // Simple noun phrase extraction using capitalization and patterns
    const phrases: string[] = [];

    // Capitalized phrases (likely proper nouns)
    const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    let match;
    while ((match = capitalizedPattern.exec(content)) !== null) {
      if (match[1].length > 2) {
        phrases.push(match[1]);
      }
    }

    // Technical terms (camelCase, snake_case)
    const technicalPattern = /\b([a-z]+[A-Z][a-zA-Z]*|[a-z]+_[a-z]+(?:_[a-z]+)*)\b/g;
    while ((match = technicalPattern.exec(content)) !== null) {
      phrases.push(match[1]);
    }

    return [...new Set(phrases)].slice(0, 10);
  }

  private computeEntityImportance(
    name: string,
    content: string,
    type: EntityType
  ): number {
    // Frequency-based importance
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const frequency = (content.match(regex) || []).length;
    const frequencyScore = Math.min(1, frequency / 5);

    // Type-based importance (actions and events are more important)
    const typeWeights: Record<EntityType, number> = {
      action: 0.9,
      event: 0.85,
      concept: 0.7,
      person: 0.8,
      object: 0.6,
      location: 0.5,
      time: 0.4,
      relation: 0.65,
    };
    const typeScore = typeWeights[type] || 0.5;

    // Position-based importance (mentioned early = more important)
    const position = content.toLowerCase().indexOf(name.toLowerCase());
    const positionScore = position >= 0 ? 1 - position / content.length : 0.5;

    // Weighted combination
    return frequencyScore * 0.4 + typeScore * 0.35 + positionScore * 0.25;
  }

  private extractRelations(
    episode: RawEpisode,
    entities: SemanticEntity[]
  ): SemanticRelation[] {
    const relations: SemanticRelation[] = [];
    const content = episode.content.toLowerCase();

    // Relation patterns
    const relationPatterns: Array<{ pattern: RegExp; type: RelationType }> = [
      { pattern: /(\w+)\s+causes?\s+(\w+)/gi, type: 'causes' },
      { pattern: /(\w+)\s+enables?\s+(\w+)/gi, type: 'enables' },
      { pattern: /(\w+)\s+blocks?\s+(\w+)/gi, type: 'blocks' },
      { pattern: /(\w+)\s+(?:is\s+)?similar\s+to\s+(\w+)/gi, type: 'similar_to' },
      { pattern: /(\w+)\s+(?:is\s+)?part\s+of\s+(\w+)/gi, type: 'part_of' },
      { pattern: /(\w+)\s+(?:is\s+)?related\s+to\s+(\w+)/gi, type: 'related_to' },
      { pattern: /(\w+)\s+before\s+(\w+)/gi, type: 'temporal_before' },
      { pattern: /(\w+)\s+after\s+(\w+)/gi, type: 'temporal_after' },
      { pattern: /(\w+)\s+depends?\s+on\s+(\w+)/gi, type: 'depends_on' },
    ];

    const entityNames = new Map(entities.map((e) => [e.name.toLowerCase(), e.id]));

    for (const { pattern, type } of relationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const sourceName = match[1].toLowerCase();
        const targetName = match[2].toLowerCase();

        const sourceId = entityNames.get(sourceName);
        const targetId = entityNames.get(targetName);

        if (sourceId && targetId && sourceId !== targetId) {
          relations.push({
            sourceId,
            targetId,
            type,
            strength: 0.7,
            evidence: [episode.id],
          });
        }
      }
    }

    // Infer co-occurrence relations
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        // Check if entities appear close together (within 100 chars)
        const pos1 = content.indexOf(e1.name.toLowerCase());
        const pos2 = content.indexOf(e2.name.toLowerCase());

        if (pos1 >= 0 && pos2 >= 0 && Math.abs(pos1 - pos2) < 100) {
          // Check if relation doesn't already exist
          const exists = relations.some(
            (r) =>
              (r.sourceId === e1.id && r.targetId === e2.id) ||
              (r.sourceId === e2.id && r.targetId === e1.id)
          );

          if (!exists) {
            relations.push({
              sourceId: e1.id,
              targetId: e2.id,
              type: 'related_to',
              strength: 0.5,
              evidence: [episode.id],
            });
          }
        }
      }
    }

    return relations.slice(0, this.config.compression.maxRelationsPerEpisode);
  }

  private generateSummary(
    episode: RawEpisode,
    entities: SemanticEntity[]
  ): string {
    // Extract key sentences based on entity density
    const sentences = episode.content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (sentences.length === 0) {
      return episode.content.slice(0, this.config.compression.summaryMaxLength);
    }

    // Score sentences by entity coverage
    const entityNames = new Set(entities.map((e) => e.name.toLowerCase()));
    const scoredSentences = sentences.map((sentence) => {
      const lowerSentence = sentence.toLowerCase();
      const entityHits = [...entityNames].filter((name) =>
        lowerSentence.includes(name)
      ).length;
      return {
        sentence,
        score: entityHits / Math.max(1, entities.length),
      };
    });

    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);

    let summary = '';
    for (const { sentence } of scoredSentences) {
      if (summary.length + sentence.length < this.config.compression.summaryMaxLength) {
        summary += (summary ? ' ' : '') + sentence + '.';
      } else {
        break;
      }
    }

    return summary || sentences[0].slice(0, this.config.compression.summaryMaxLength);
  }

  private extractConcepts(
    episode: RawEpisode,
    entities: SemanticEntity[]
  ): string[] {
    const concepts = new Set<string>();

    // Add entity names as concepts
    for (const entity of entities) {
      if (entity.type === 'concept' || entity.type === 'action') {
        concepts.add(entity.name.toLowerCase());
      }
    }

    // Extract hashtags or explicit tags
    const hashtagPattern = /#(\w+)/g;
    let match;
    while ((match = hashtagPattern.exec(episode.content)) !== null) {
      concepts.add(match[1].toLowerCase());
    }

    // Episode type as concept
    concepts.add(episode.type);

    return [...concepts].slice(0, 20);
  }

  private identifyCausalChains(
    episode: RawEpisode,
    relations: SemanticRelation[]
  ): string[] {
    const causalChains: string[] = [];

    // Find chains of causal relations
    const causalRelations = relations.filter(
      (r) => r.type === 'causes' || r.type === 'enables' || r.type === 'depends_on'
    );

    // Build adjacency list
    const graph = new Map<string, string[]>();
    for (const rel of causalRelations) {
      if (!graph.has(rel.sourceId)) {
        graph.set(rel.sourceId, []);
      }
      graph.get(rel.sourceId)!.push(rel.targetId);
    }

    // Find chains (simple DFS)
    const visited = new Set<string>();
    for (const [start] of graph) {
      if (!visited.has(start)) {
        const chain: string[] = [];
        let current: string | undefined = start;
        while (current && !visited.has(current)) {
          visited.add(current);
          chain.push(current);
          const neighbors: string[] = graph.get(current) || [];
          current = neighbors[0];
        }
        if (chain.length > 1) {
          causalChains.push(`chain-${episode.id}-${causalChains.length}`);
        }
      }
    }

    return causalChains;
  }

  private computeCompressionQuality(
    entities: SemanticEntity[],
    relations: SemanticRelation[],
    episode: RawEpisode
  ): number {
    // Quality based on extraction coverage
    const contentLength = episode.content.length;

    // Entity coverage (more entities for longer content = higher quality)
    const expectedEntities = Math.min(20, Math.ceil(contentLength / 100));
    const entityCoverage = Math.min(1, entities.length / expectedEntities);

    // Relation density (relations per entity)
    const relationDensity = entities.length > 0
      ? Math.min(1, relations.length / (entities.length * 2))
      : 0;

    // Entity quality (average importance)
    const avgImportance = entities.length > 0
      ? entities.reduce((sum, e) => sum + e.importance, 0) / entities.length
      : 0;

    return entityCoverage * 0.4 + relationDensity * 0.3 + avgImportance * 0.3;
  }

  private updateCompressionMetrics(
    compressed: CompressedEpisode,
    processingTime: number
  ): void {
    const m = this.metrics.compression;
    const n = m.episodesProcessed + 1;

    m.avgCompressionRatio =
      (m.avgCompressionRatio * m.episodesProcessed + compressed.compressionRatio) / n;
    m.avgProcessingTime =
      (m.avgProcessingTime * m.episodesProcessed + processingTime) / n;
    m.entitiesExtracted += compressed.entities.length;
    m.relationsExtracted += compressed.relations.length;
    m.episodesProcessed = n;
  }

  // ---------------------------------------------------------------------------
  // Stage 2: Online Semantic Synthesis
  // ---------------------------------------------------------------------------

  /**
   * Synthesize a compressed episode into consolidated memory.
   *
   * During write:
   * - Find related episodes in the episode graph
   * - Compute semantic overlap
   * - Merge compatible episodes
   * - Update episode graph
   *
   * @param episode - Compressed episode to synthesize
   * @returns Consolidated memory (new or merged)
   */
  synthesize(episode: CompressedEpisode): ConsolidatedMemory {
    // Find related episodes
    const relatedIds = this.findRelatedEpisodes(episode);

    // Compute semantic overlap with each related episode
    const candidates: Array<{ id: string; overlap: number }> = [];
    for (const relatedId of relatedIds) {
      const related = this.episodes.get(relatedId);
      if (related) {
        const overlap = this.computeSemanticOverlap(episode, related);
        if (overlap >= this.config.synthesis.overlapThreshold) {
          candidates.push({ id: relatedId, overlap });
        }
      }
    }

    // Sort by overlap score
    candidates.sort((a, b) => b.overlap - a.overlap);

    // Check for existing consolidated memory to merge into
    let targetMemory: ConsolidatedMemory | null = null;

    for (const { id } of candidates) {
      // Check if this episode is already in a consolidated memory
      for (const [clusterId, memory] of this.memories) {
        if (memory.episodeIds.includes(id)) {
          // Check if we can add to this cluster
          if (memory.episodeIds.length < this.config.synthesis.maxEpisodesPerCluster) {
            targetMemory = memory;
            break;
          }
        }
      }
      if (targetMemory) break;
    }

    let consolidated: ConsolidatedMemory;

    if (targetMemory && this.config.synthesis.enableAutoMerge) {
      // Merge into existing memory
      consolidated = this.mergeIntoMemory(episode, targetMemory);
      this.updateSynthesisMetrics(true, candidates[0]?.overlap || 0, consolidated.consolidation.coherenceScore);
    } else {
      // Create new consolidated memory
      consolidated = this.createNewMemory(episode);
      this.updateSynthesisMetrics(false, 0, consolidated.consolidation.coherenceScore);
    }

    // Update episode graph
    this.updateEpisodeGraph(episode, relatedIds);

    // Store in memories
    this.memories.set(consolidated.clusterId, consolidated);

    return consolidated;
  }

  private findRelatedEpisodes(episode: CompressedEpisode): string[] {
    const related = new Set<string>();

    // Check concept index
    for (const concept of episode.concepts) {
      const episodeIds = this.semanticIndex.get(concept) || [];
      for (const id of episodeIds) {
        if (id !== episode.id) {
          related.add(id);
        }
      }
    }

    // Check entity index
    for (const entity of episode.entities) {
      const episodeIds = this.entityIndex.get(entity.name.toLowerCase()) || [];
      for (const id of episodeIds) {
        if (id !== episode.id) {
          related.add(id);
        }
      }
    }

    // Check temporal proximity (within 1 hour bucket)
    const bucket = Math.floor(episode.temporal.start / (60 * 60 * 1000));
    for (const offset of [-1, 0, 1]) {
      const episodeIds = this.temporalIndex.get(bucket + offset) || [];
      for (const id of episodeIds) {
        if (id !== episode.id) {
          related.add(id);
        }
      }
    }

    // Check episode graph
    const graphRelated = this.episodeGraph.get(episode.id);
    if (graphRelated) {
      for (const id of graphRelated) {
        related.add(id);
      }
    }

    return [...related];
  }

  private computeSemanticOverlap(
    episode1: CompressedEpisode,
    episode2: CompressedEpisode
  ): number {
    // Concept overlap (Jaccard similarity)
    const concepts1 = new Set(episode1.concepts);
    const concepts2 = new Set(episode2.concepts);
    const conceptIntersection = [...concepts1].filter((c) => concepts2.has(c)).length;
    const conceptUnion = new Set([...concepts1, ...concepts2]).size;
    const conceptOverlap = conceptUnion > 0 ? conceptIntersection / conceptUnion : 0;

    // Entity overlap (Jaccard on entity names)
    const entityNames1 = new Set(episode1.entities.map((e) => e.name.toLowerCase()));
    const entityNames2 = new Set(episode2.entities.map((e) => e.name.toLowerCase()));
    const entityIntersection = [...entityNames1].filter((e) => entityNames2.has(e)).length;
    const entityUnion = new Set([...entityNames1, ...entityNames2]).size;
    const entityOverlap = entityUnion > 0 ? entityIntersection / entityUnion : 0;

    // Type compatibility
    const typeMatch = episode1.type === episode2.type ? 1 : 0.5;

    // Weighted combination
    return conceptOverlap * 0.4 + entityOverlap * 0.4 + typeMatch * 0.2;
  }

  private mergeIntoMemory(
    episode: CompressedEpisode,
    memory: ConsolidatedMemory
  ): ConsolidatedMemory {
    // Add episode to cluster
    memory.episodeIds.push(episode.id);

    // Merge entities (deduplicate by name)
    const existingNames = new Set(memory.entities.map((e) => e.name.toLowerCase()));
    for (const entity of episode.entities) {
      if (!existingNames.has(entity.name.toLowerCase())) {
        memory.entities.push(entity);
        existingNames.add(entity.name.toLowerCase());
      } else {
        // Update existing entity importance
        const existing = memory.entities.find(
          (e) => e.name.toLowerCase() === entity.name.toLowerCase()
        );
        if (existing) {
          existing.importance = Math.max(existing.importance, entity.importance);
          existing.sourceEpisodes.push(...entity.sourceEpisodes);
        }
      }
    }

    // Merge relations (strengthen overlapping)
    for (const relation of episode.relations) {
      const existing = memory.relations.find(
        (r) =>
          r.sourceId === relation.sourceId &&
          r.targetId === relation.targetId &&
          r.type === relation.type
      );
      if (existing) {
        existing.strength = Math.min(1, existing.strength + 0.1);
        existing.evidence.push(...relation.evidence);
      } else {
        memory.relations.push(relation);
      }
    }

    // Update concepts
    const conceptSet = new Set(memory.concepts);
    for (const concept of episode.concepts) {
      conceptSet.add(concept);
    }
    memory.concepts = [...conceptSet];

    // Update summary (append key points)
    if (memory.summary.length + episode.summary.length < 1000) {
      memory.summary = `${memory.summary} ${episode.summary}`.trim();
    }

    // Update consolidation metadata
    memory.consolidation.mergeCount++;
    memory.consolidation.consolidatedAt = Date.now();
    memory.consolidation.coherenceScore = this.computeCoherence(memory);

    // Recalculate importance
    memory.importance = this.computeMemoryImportance(memory);

    return memory;
  }

  private createNewMemory(episode: CompressedEpisode): ConsolidatedMemory {
    const clusterId = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      clusterId,
      episodeIds: [episode.id],
      entities: [...episode.entities],
      relations: [...episode.relations],
      summary: episode.summary,
      concepts: [...episode.concepts],
      consolidation: {
        mergeCount: 0,
        overlapScore: 0,
        coherenceScore: episode.qualityScore,
        consolidatedAt: Date.now(),
      },
      importance: this.computeMemoryImportance({ entities: episode.entities, episodeIds: [episode.id] } as ConsolidatedMemory),
      lastAccessed: Date.now(),
      accessCount: 0,
    };
  }

  private computeCoherence(memory: ConsolidatedMemory): number {
    // Coherence based on entity connectivity and concept consistency
    const entityCount = memory.entities.length;
    const relationCount = memory.relations.length;

    // Relation density
    const maxRelations = (entityCount * (entityCount - 1)) / 2;
    const relationDensity = maxRelations > 0 ? relationCount / maxRelations : 0;

    // Concept consistency (fewer concepts relative to episodes = more coherent)
    const conceptPerEpisode = memory.concepts.length / memory.episodeIds.length;
    const conceptConsistency = Math.max(0, 1 - (conceptPerEpisode - 5) / 20);

    return relationDensity * 0.6 + conceptConsistency * 0.4;
  }

  private computeMemoryImportance(memory: ConsolidatedMemory): number {
    // Importance based on size, entity importance, and access patterns
    const sizeScore = Math.min(1, memory.episodeIds.length / 5);
    const entityScore = memory.entities.length > 0
      ? memory.entities.reduce((sum, e) => sum + e.importance, 0) / memory.entities.length
      : 0.5;
    const accessScore = Math.min(1, memory.accessCount / 10);

    return sizeScore * 0.3 + entityScore * 0.5 + accessScore * 0.2;
  }

  private updateEpisodeGraph(
    episode: CompressedEpisode,
    relatedIds: string[]
  ): void {
    // Add episode to graph
    if (!this.episodeGraph.has(episode.id)) {
      this.episodeGraph.set(episode.id, new Set());
    }

    // Add bidirectional edges
    const episodeEdges = this.episodeGraph.get(episode.id)!;
    for (const relatedId of relatedIds.slice(0, 10)) { // Limit connections
      episodeEdges.add(relatedId);

      if (!this.episodeGraph.has(relatedId)) {
        this.episodeGraph.set(relatedId, new Set());
      }
      this.episodeGraph.get(relatedId)!.add(episode.id);
    }
  }

  private updateSynthesisMetrics(
    merged: boolean,
    overlapScore: number,
    coherenceScore: number
  ): void {
    const m = this.metrics.synthesis;

    if (merged) {
      m.mergesPerformed++;
      const n = m.mergesPerformed;
      m.avgOverlapScore = (m.avgOverlapScore * (n - 1) + overlapScore) / n;
    }

    m.consolidatedMemories = this.memories.size;
    const total = m.mergesPerformed + m.consolidatedMemories;
    m.avgCoherenceScore =
      (m.avgCoherenceScore * (total - 1) + coherenceScore) / total;
  }

  // ---------------------------------------------------------------------------
  // Stage 3: Intent-Aware Retrieval Planning
  // ---------------------------------------------------------------------------

  /**
   * Retrieve episodes based on query and intent.
   *
   * Strategy selection:
   * - Analyze retrieval intent (recall, associate, pattern, etc.)
   * - Select optimal index (temporal, semantic, causal, entity)
   * - Plan retrieval strategy (breadth/depth/hybrid)
   * - Execute with early termination when quality threshold met
   *
   * @param query - Retrieval query
   * @param intent - Retrieval intent for planning
   * @returns Ranked episodes with metadata
   */
  retrieve(query: RetrievalQuery, intent: RetrievalIntent): RankedEpisodes {
    const startTime = performance.now();

    // Step 1: Analyze intent and select index
    const indexType = this.selectOptimalIndex(query, intent);

    // Step 2: Plan retrieval strategy
    const strategy = this.planRetrievalStrategy(intent);

    // Step 3: Get candidates from selected index
    const candidates = this.getCandidatesFromIndex(query, indexType);

    // Step 4: Score and rank candidates
    const scored = this.scoreCandidates(candidates, query);

    // Step 5: Apply early termination
    const results = this.applyEarlyTermination(scored, query, intent);

    // Build response
    const queryTime = performance.now() - startTime;
    const quality = this.computeRetrievalQuality(results, query);

    // Update metrics
    this.updateRetrievalMetrics(
      queryTime,
      results.length,
      scored.length,
      results.length < scored.length,
      indexType
    );

    return {
      results,
      metadata: {
        queryTime,
        indexUsed: indexType,
        strategy,
        earlyTerminated: results.length < scored.length,
        candidatesScanned: scored.length,
        resultsReturned: results.length,
      },
      quality,
    };
  }

  private selectOptimalIndex(
    query: RetrievalQuery,
    intent: RetrievalIntent
  ): IndexType {
    // Select index based on intent type
    switch (intent.type) {
      case 'temporal':
        return 'temporal';
      case 'causal':
        return 'causal';
      case 'recall':
      case 'pattern':
        return 'entity';
      case 'associate':
      case 'semantic':
      default:
        return 'semantic';
    }
  }

  private planRetrievalStrategy(intent: RetrievalIntent): RetrievalStrategy {
    // Strategy based on breadth and depth preferences
    if (intent.breadth === 'wide' && intent.depth === 'shallow') {
      return 'breadth_first';
    }
    if (intent.breadth === 'narrow' && intent.depth === 'deep') {
      return 'depth_first';
    }
    if (intent.urgency === 'critical') {
      return 'adaptive'; // Fastest path to good results
    }
    return 'hybrid';
  }

  private getCandidatesFromIndex(
    query: RetrievalQuery,
    indexType: IndexType
  ): string[] {
    const candidates = new Set<string>();

    // Extract query concepts
    const queryTerms = query.query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    switch (indexType) {
      case 'temporal':
        // Get episodes within time range
        if (query.timeRange) {
          const startBucket = Math.floor((query.timeRange.start || 0) / (60 * 60 * 1000));
          const endBucket = Math.floor((query.timeRange.end || Date.now()) / (60 * 60 * 1000));
          for (let bucket = startBucket; bucket <= endBucket; bucket++) {
            const ids = this.temporalIndex.get(bucket) || [];
            for (const id of ids) {
              candidates.add(id);
            }
          }
        } else {
          // Recent episodes (last 24 hours)
          const now = Date.now();
          const startBucket = Math.floor((now - 24 * 60 * 60 * 1000) / (60 * 60 * 1000));
          const endBucket = Math.floor(now / (60 * 60 * 1000));
          for (let bucket = startBucket; bucket <= endBucket; bucket++) {
            const ids = this.temporalIndex.get(bucket) || [];
            for (const id of ids) {
              candidates.add(id);
            }
          }
        }
        break;

      case 'semantic':
        // Get episodes matching query concepts
        for (const term of queryTerms) {
          const ids = this.semanticIndex.get(term) || [];
          for (const id of ids) {
            candidates.add(id);
          }
        }
        break;

      case 'entity':
        // Get episodes by entity name match
        for (const term of queryTerms) {
          const ids = this.entityIndex.get(term) || [];
          for (const id of ids) {
            candidates.add(id);
          }
        }
        break;

      case 'causal':
        // Get episodes in causal chains
        for (const term of queryTerms) {
          for (const [chain, ids] of this.causalIndex) {
            if (chain.includes(term)) {
              for (const id of ids) {
                candidates.add(id);
              }
            }
          }
        }
        break;

      case 'concept':
      default:
        // Fallback to semantic index
        for (const term of queryTerms) {
          const ids = this.semanticIndex.get(term) || [];
          for (const id of ids) {
            candidates.add(id);
          }
        }
    }

    // Also search consolidated memories
    for (const [clusterId, memory] of this.memories) {
      const conceptMatch = memory.concepts.some((c) =>
        queryTerms.some((t) => c.includes(t) || t.includes(c))
      );
      if (conceptMatch) {
        candidates.add(clusterId);
      }
    }

    // Apply type filter
    if (query.types && query.types.length > 0) {
      const filtered = new Set<string>();
      for (const id of candidates) {
        const episode = this.episodes.get(id);
        if (episode && query.types.includes(episode.type)) {
          filtered.add(id);
        }
        // Keep memory clusters (they may contain matching types)
        if (this.memories.has(id)) {
          filtered.add(id);
        }
      }
      return [...filtered].slice(0, this.config.retrieval.maxCandidates);
    }

    return [...candidates].slice(0, this.config.retrieval.maxCandidates);
  }

  private scoreCandidates(
    candidateIds: string[],
    query: RetrievalQuery
  ): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const queryTerms = query.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    for (const id of candidateIds) {
      // Check if it's a consolidated memory
      const memory = this.memories.get(id);
      if (memory) {
        const relevance = this.computeMemoryRelevance(memory, queryTerms);
        if (relevance >= (query.minRelevance || this.config.retrieval.minRelevanceDefault)) {
          results.push({
            id,
            isConsolidated: true,
            relevance,
            matchType: 'semantic',
            summary: memory.summary,
            matchedEntities: memory.entities
              .filter((e) => queryTerms.some((t) => e.name.toLowerCase().includes(t)))
              .map((e) => e.name),
            content: memory,
          });
        }
        continue;
      }

      // Check compressed episode
      const episode = this.episodes.get(id);
      if (episode) {
        const relevance = this.computeEpisodeRelevance(episode, queryTerms);
        if (relevance >= (query.minRelevance || this.config.retrieval.minRelevanceDefault)) {
          results.push({
            id,
            isConsolidated: false,
            relevance,
            matchType: this.determineMatchType(episode, queryTerms),
            summary: episode.summary,
            matchedEntities: episode.entities
              .filter((e) => queryTerms.some((t) => e.name.toLowerCase().includes(t)))
              .map((e) => e.name),
            content: episode,
          });
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
  }

  private computeMemoryRelevance(
    memory: ConsolidatedMemory,
    queryTerms: string[]
  ): number {
    // Concept match
    const conceptMatches = memory.concepts.filter((c) =>
      queryTerms.some((t) => c.includes(t) || t.includes(c))
    ).length;
    const conceptScore = conceptMatches / Math.max(1, queryTerms.length);

    // Entity match
    const entityMatches = memory.entities.filter((e) =>
      queryTerms.some((t) => e.name.toLowerCase().includes(t))
    ).length;
    const entityScore = entityMatches / Math.max(1, queryTerms.length);

    // Summary match
    const summaryLower = memory.summary.toLowerCase();
    const summaryMatches = queryTerms.filter((t) => summaryLower.includes(t)).length;
    const summaryScore = summaryMatches / Math.max(1, queryTerms.length);

    // Importance boost
    const importanceBoost = memory.importance * 0.2;

    // Recency boost
    const age = Date.now() - memory.lastAccessed;
    const recencyBoost = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000)); // Decay over 1 week

    return Math.min(
      1,
      conceptScore * 0.35 + entityScore * 0.3 + summaryScore * 0.2 +
      importanceBoost + recencyBoost * 0.15
    );
  }

  private computeEpisodeRelevance(
    episode: CompressedEpisode,
    queryTerms: string[]
  ): number {
    // Concept match
    const conceptMatches = episode.concepts.filter((c) =>
      queryTerms.some((t) => c.includes(t) || t.includes(c))
    ).length;
    const conceptScore = conceptMatches / Math.max(1, queryTerms.length);

    // Entity match
    const entityMatches = episode.entities.filter((e) =>
      queryTerms.some((t) => e.name.toLowerCase().includes(t))
    ).length;
    const entityScore = entityMatches / Math.max(1, queryTerms.length);

    // Summary match
    const summaryLower = episode.summary.toLowerCase();
    const summaryMatches = queryTerms.filter((t) => summaryLower.includes(t)).length;
    const summaryScore = summaryMatches / Math.max(1, queryTerms.length);

    // Quality boost
    const qualityBoost = episode.qualityScore * 0.15;

    return Math.min(
      1,
      conceptScore * 0.35 + entityScore * 0.35 + summaryScore * 0.15 + qualityBoost
    );
  }

  private determineMatchType(
    episode: CompressedEpisode,
    queryTerms: string[]
  ): RetrievalResult['matchType'] {
    // Check for exact match in summary
    const summaryLower = episode.summary.toLowerCase();
    const exactMatches = queryTerms.filter((t) => summaryLower.includes(` ${t} `)).length;
    if (exactMatches > queryTerms.length * 0.5) {
      return 'exact';
    }

    // Check for causal chain involvement
    if (episode.causalChains.length > 0) {
      return 'causal';
    }

    // Check temporal context
    const now = Date.now();
    const age = now - episode.temporal.start;
    if (age < 24 * 60 * 60 * 1000) { // Last 24 hours
      return 'temporal';
    }

    return 'semantic';
  }

  private applyEarlyTermination(
    results: RetrievalResult[],
    query: RetrievalQuery,
    intent: RetrievalIntent
  ): RetrievalResult[] {
    const limit = query.limit || this.config.retrieval.defaultLimit;

    // Early termination based on quality threshold
    const threshold = this.config.retrieval.earlyTerminationThreshold;

    // For critical urgency, terminate early if we have good results
    if (intent.urgency === 'critical') {
      const goodResults = results.filter((r) => r.relevance >= threshold);
      if (goodResults.length >= Math.min(3, limit)) {
        return goodResults.slice(0, limit);
      }
    }

    // For high urgency, terminate when we have enough above threshold
    if (intent.urgency === 'high') {
      const goodResults = results.filter((r) => r.relevance >= threshold * 0.8);
      if (goodResults.length >= limit) {
        return goodResults.slice(0, limit);
      }
    }

    // Default: return top results up to limit
    return results.slice(0, limit);
  }

  private computeRetrievalQuality(
    results: RetrievalResult[],
    query: RetrievalQuery
  ): DQScore {
    if (results.length === 0) {
      return {
        score: 0,
        components: { validity: 0, specificity: 0, correctness: 0 },
        isActionable: false,
        timestamp: Date.now(),
      };
    }

    // Validity: did we return results?
    const validity = results.length > 0 ? 1 : 0;

    // Specificity: average relevance score
    const avgRelevance = results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
    const specificity = avgRelevance;

    // Correctness: coverage of query terms
    const queryTerms = query.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const coveredTerms = new Set<string>();
    for (const result of results) {
      for (const entity of result.matchedEntities) {
        for (const term of queryTerms) {
          if (entity.toLowerCase().includes(term)) {
            coveredTerms.add(term);
          }
        }
      }
    }
    const correctness = queryTerms.length > 0
      ? coveredTerms.size / queryTerms.length
      : 0.5;

    const score = validity * 0.4 + specificity * 0.3 + correctness * 0.3;

    return {
      score,
      components: { validity, specificity, correctness },
      isActionable: score >= 0.7,
      timestamp: Date.now(),
    };
  }

  private updateRetrievalMetrics(
    queryTime: number,
    resultsReturned: number,
    candidatesScanned: number,
    earlyTerminated: boolean,
    indexType: IndexType
  ): void {
    const m = this.metrics.retrieval;
    const n = m.queriesProcessed + 1;

    m.avgQueryTime = (m.avgQueryTime * m.queriesProcessed + queryTime) / n;
    m.avgResultsReturned = (m.avgResultsReturned * m.queriesProcessed + resultsReturned) / n;
    m.queriesProcessed = n;

    if (earlyTerminated) {
      m.earlyTerminations++;
    }

    const currentCount = m.indexDistribution.get(indexType) || 0;
    m.indexDistribution.set(indexType, currentCount + 1);
  }

  // ---------------------------------------------------------------------------
  // Full Pipeline: store()
  // ---------------------------------------------------------------------------

  /**
   * Store an episode through the full 3-stage pipeline.
   *
   * Pipeline:
   * 1. Compress raw episode (Stage 1)
   * 2. Update indices
   * 3. Synthesize into consolidated memory (Stage 2)
   * 4. Apply forgetting if needed
   *
   * @param episode - Raw episode to store
   * @returns Episode ID
   */
  async store(episode: RawEpisode): Promise<string> {
    // Stage 1: Compress
    const compressed = this.compress(episode);

    // Store compressed episode
    this.episodes.set(compressed.id, compressed);

    // Update indices
    this.updateIndices(compressed);

    // Stage 2: Synthesize
    this.synthesize(compressed);

    // Update overall metrics
    this.updateOverallMetrics();

    // Apply forgetting if enabled
    if (this.config.memory.forgettingEnabled) {
      await this.applyForgetting();
    }

    return compressed.id;
  }

  private updateIndices(episode: CompressedEpisode): void {
    // Temporal index
    const bucket = Math.floor(episode.temporal.start / (60 * 60 * 1000));
    if (!this.temporalIndex.has(bucket)) {
      this.temporalIndex.set(bucket, []);
    }
    this.temporalIndex.get(bucket)!.push(episode.id);

    // Semantic index (by concept)
    for (const concept of episode.concepts) {
      if (!this.semanticIndex.has(concept)) {
        this.semanticIndex.set(concept, []);
      }
      this.semanticIndex.get(concept)!.push(episode.id);
    }

    // Entity index
    for (const entity of episode.entities) {
      const key = entity.name.toLowerCase();
      if (!this.entityIndex.has(key)) {
        this.entityIndex.set(key, []);
      }
      this.entityIndex.get(key)!.push(episode.id);
    }

    // Causal index
    for (const chain of episode.causalChains) {
      if (!this.causalIndex.has(chain)) {
        this.causalIndex.set(chain, []);
      }
      this.causalIndex.get(chain)!.push(episode.id);
    }
  }

  private updateOverallMetrics(): void {
    this.metrics.overall.totalEpisodes = this.episodes.size;
    this.metrics.overall.totalMemories = this.memories.size;

    // Storage efficiency: consolidated vs raw
    const rawCount = this.episodes.size;
    const consolidatedCount = this.memories.size;
    this.metrics.overall.storageEfficiency = consolidatedCount > 0
      ? rawCount / consolidatedCount
      : 1;
  }

  private async applyForgetting(): Promise<void> {
    // Check if we exceed limits
    if (this.episodes.size <= this.config.memory.maxEpisodes) {
      return;
    }

    // Calculate how many to forget
    const toForget = Math.ceil(
      this.episodes.size * this.config.memory.forgettingRate
    );

    // Score episodes for forgetting (low importance, old, rarely accessed)
    const scored: Array<{ id: string; forgetScore: number }> = [];

    for (const [id, episode] of this.episodes) {
      const age = Date.now() - episode.temporal.start;
      const ageScore = Math.min(1, age / (30 * 24 * 60 * 60 * 1000)); // Max at 30 days

      // Check if part of consolidated memory
      let inMemory = false;
      for (const memory of this.memories.values()) {
        if (memory.episodeIds.includes(id)) {
          inMemory = true;
          break;
        }
      }

      // Higher score = more likely to forget
      const forgetScore = inMemory
        ? ageScore * 0.3 // Protect episodes in memories
        : ageScore * 0.7 + (1 - episode.qualityScore) * 0.3;

      scored.push({ id, forgetScore });
    }

    // Sort by forget score (highest first)
    scored.sort((a, b) => b.forgetScore - a.forgetScore);

    // Forget top N
    for (let i = 0; i < toForget && i < scored.length; i++) {
      const { id } = scored[i];
      this.forgetEpisode(id);
    }
  }

  private forgetEpisode(id: string): void {
    const episode = this.episodes.get(id);
    if (!episode) return;

    // Remove from indices
    for (const concept of episode.concepts) {
      const ids = this.semanticIndex.get(concept);
      if (ids) {
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
      }
    }

    for (const entity of episode.entities) {
      const key = entity.name.toLowerCase();
      const ids = this.entityIndex.get(key);
      if (ids) {
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
      }
    }

    const bucket = Math.floor(episode.temporal.start / (60 * 60 * 1000));
    const temporalIds = this.temporalIndex.get(bucket);
    if (temporalIds) {
      const idx = temporalIds.indexOf(id);
      if (idx >= 0) temporalIds.splice(idx, 1);
    }

    // Remove from episode graph
    this.episodeGraph.delete(id);
    for (const edges of this.episodeGraph.values()) {
      edges.delete(id);
    }

    // Remove episode
    this.episodes.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Public Accessors
  // ---------------------------------------------------------------------------

  /**
   * Get current metrics.
   */
  getMetrics(): SimpleMemMetrics {
    return {
      compression: { ...this.metrics.compression },
      synthesis: { ...this.metrics.synthesis },
      retrieval: {
        ...this.metrics.retrieval,
        indexDistribution: new Map(this.metrics.retrieval.indexDistribution),
      },
      overall: { ...this.metrics.overall },
    };
  }

  /**
   * Get configuration.
   */
  getConfig(): SimpleMemConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<SimpleMemConfig>): void {
    this.config = this.mergeConfig(this.config, config);
  }

  /**
   * Get episode by ID.
   */
  getEpisode(id: string): CompressedEpisode | undefined {
    return this.episodes.get(id);
  }

  /**
   * Get memory by cluster ID.
   */
  getMemory(clusterId: string): ConsolidatedMemory | undefined {
    const memory = this.memories.get(clusterId);
    if (memory) {
      // Update access tracking
      memory.lastAccessed = Date.now();
      memory.accessCount++;
    }
    return memory;
  }

  /**
   * Get all episodes.
   */
  getAllEpisodes(): CompressedEpisode[] {
    return Array.from(this.episodes.values());
  }

  /**
   * Get all consolidated memories.
   */
  getAllMemories(): ConsolidatedMemory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.episodes.clear();
    this.memories.clear();
    this.temporalIndex.clear();
    this.semanticIndex.clear();
    this.causalIndex.clear();
    this.entityIndex.clear();
    this.episodeGraph.clear();

    // Reset metrics
    this.metrics = {
      compression: {
        episodesProcessed: 0,
        avgCompressionRatio: 0,
        avgProcessingTime: 0,
        entitiesExtracted: 0,
        relationsExtracted: 0,
      },
      synthesis: {
        mergesPerformed: 0,
        avgOverlapScore: 0,
        avgCoherenceScore: 0,
        consolidatedMemories: 0,
      },
      retrieval: {
        queriesProcessed: 0,
        avgQueryTime: 0,
        avgResultsReturned: 0,
        earlyTerminations: 0,
        indexDistribution: new Map(),
      },
      overall: {
        totalEpisodes: 0,
        totalMemories: 0,
        storageEfficiency: 1.0,
        avgDqScore: 0.8,
      },
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of SimpleMem.
 */
export const simpleMem = SimpleMem.getInstance();

/**
 * Factory function for creating isolated instances (testing).
 */
export function createSimpleMem(config?: Partial<SimpleMemConfig>): SimpleMem {
  SimpleMem.resetInstance();
  return SimpleMem.getInstance(config);
}
