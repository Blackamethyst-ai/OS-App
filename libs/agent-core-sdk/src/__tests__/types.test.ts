/**
 * Tests for Agent Core SDK Types
 *
 * Since types.ts is purely TypeScript interfaces and type aliases (no runtime code),
 * these tests verify structural compliance: that objects matching the interfaces
 * are assignable and that the type system enforces constraints correctly.
 */
import { describe, it, expect } from 'vitest';

import type {
  SessionSummary,
  SessionDetail,
  Finding,
  FindingType,
  EvidenceSource,
  CapturedUrl,
  SearchQuery,
  SearchResult,
  ContextPack,
  PackSelection,
  SelectedPacks,
  ReinvigorationContext,
  Lineage,
  ApiHealth,
  CreateFindingRequest,
  CreateFindingResponse,
  GraphNode,
  GraphEdge,
  RelatedConceptsResult,
  SessionLineageResult,
  SessionsGraphResult,
  CognitiveState,
  PredictionRequest,
  ErrorPattern,
  SessionPrediction,
  ErrorPredictionRequest,
  ErrorPredictionResponse,
  OptimalTimeRequest,
  OptimalTimeResponse,
  PredictionAccuracy,
  PredictionOutcomeUpdate,
  MultiSearchResults,
  CalibrationWeights,
  AgentCoreClientOptions,
} from '../types';

describe('Agent Core SDK Types', () => {
  describe('SessionSummary', () => {
    it('should accept a valid SessionSummary object', () => {
      const session: SessionSummary = {
        id: 'sess-001',
        topic: 'multi-agent orchestration',
        status: 'active',
        project: 'os-app',
        url_count: 5,
        finding_count: 3,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(session.id).toBe('sess-001');
      expect(session.topic).toBe('multi-agent orchestration');
      expect(session.url_count).toBe(5);
    });

    it('should accept null for optional nullable fields', () => {
      const session: SessionSummary = {
        id: 'sess-002',
        topic: null,
        status: 'completed',
        project: null,
        url_count: 0,
        finding_count: 0,
        created_at: null,
      };
      expect(session.topic).toBeNull();
      expect(session.project).toBeNull();
      expect(session.created_at).toBeNull();
    });
  });

  describe('SessionDetail', () => {
    it('should extend SessionSummary with findings, urls, and lineage', () => {
      const detail: SessionDetail = {
        id: 'sess-003',
        topic: 'testing',
        status: 'active',
        project: 'os-app',
        url_count: 1,
        finding_count: 1,
        created_at: '2026-01-01T00:00:00Z',
        findings: [
          {
            id: 'f-1',
            session_id: 'sess-003',
            content: 'Important finding',
            type: 'thesis',
            confidence: 0.95,
            sources: [],
            needs_review: false,
          },
        ],
        urls: [{ url: 'https://example.com', tier: 1, category: 'paper' }],
        lineage: {},
      };
      expect(detail.findings).toHaveLength(1);
      expect(detail.urls).toHaveLength(1);
      expect(detail.lineage).toBeDefined();
    });
  });

  describe('FindingType', () => {
    it('should include all expected finding type values', () => {
      const types: FindingType[] = [
        'thesis',
        'gap',
        'innovation',
        'finding',
        'implementation',
        'metrics',
        'milestone',
        'decision',
        'pattern',
      ];
      expect(types).toHaveLength(9);
      expect(types).toContain('thesis');
      expect(types).toContain('pattern');
    });
  });

  describe('EvidenceSource', () => {
    it('should accept a full evidence source with optional fields', () => {
      const source: EvidenceSource = {
        url: 'https://arxiv.org/abs/2601.21233',
        arxiv_id: '2601.21233',
        excerpt: 'Important excerpt',
        relevance_score: 0.92,
        verified: true,
        accessed_at: '2026-01-15T10:00:00Z',
      };
      expect(source.arxiv_id).toBe('2601.21233');
      expect(source.verified).toBe(true);
    });

    it('should accept evidence source without optional fields', () => {
      const source: EvidenceSource = {
        url: 'https://example.com',
        excerpt: 'Some excerpt',
        relevance_score: 0.5,
        verified: false,
      };
      expect(source.arxiv_id).toBeUndefined();
      expect(source.accessed_at).toBeUndefined();
    });
  });

  describe('CapturedUrl', () => {
    it('should enforce tier as 1, 2, or 3', () => {
      const urls: CapturedUrl[] = [
        { url: 'https://a.com', tier: 1, category: 'paper' },
        { url: 'https://b.com', tier: 2, category: 'blog' },
        { url: 'https://c.com', tier: 3, category: 'social', context: 'found via twitter' },
      ];
      expect(urls[0].tier).toBe(1);
      expect(urls[1].tier).toBe(2);
      expect(urls[2].tier).toBe(3);
      expect(urls[2].context).toBe('found via twitter');
    });
  });

  describe('SearchQuery and SearchResult', () => {
    it('should build a valid SearchQuery', () => {
      const query: SearchQuery = {
        query: 'multi-agent orchestration',
        category: 'patterns',
        limit: 10,
        min_confidence: 0.7,
        project: 'os-app',
      };
      expect(query.query).toBe('multi-agent orchestration');
      expect(query.category).toBe('patterns');
    });

    it('should accept SearchResult with optional fields', () => {
      const result: SearchResult = {
        content: 'Some result content',
        category: 'facts',
        similarity: 0.88,
        tags: ['ai', 'agents'],
        session_id: 'sess-001',
        id: 'r-1',
        title: 'Result Title',
        url: 'https://example.com',
        relevance: 0.9,
        tier: 1,
        finding: 'A finding',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(result.similarity).toBe(0.88);
      expect(result.tags).toContain('ai');
    });
  });

  describe('GraphNode and GraphEdge', () => {
    it('should create valid graph structures', () => {
      const node: GraphNode = {
        id: 'n-1',
        label: 'Research Session',
        type: 'session',
        relevance: 0.95,
        isRoot: true,
      };
      const edge: GraphEdge = {
        source: 'n-1',
        target: 'n-2',
        relation: 'builds_on',
      };
      expect(node.type).toBe('session');
      expect(node.isRoot).toBe(true);
      expect(edge.relation).toBe('builds_on');
    });

    it('should accept custom string types for node type and edge relation', () => {
      const node: GraphNode = {
        id: 'n-custom',
        label: 'Custom Node',
        type: 'custom_type',
      };
      const edge: GraphEdge = {
        source: 'n-1',
        target: 'n-custom',
        relation: 'custom_relation',
      };
      expect(node.type).toBe('custom_type');
      expect(edge.relation).toBe('custom_relation');
    });
  });

  describe('CognitiveState', () => {
    it('should accept all cognitive mode values', () => {
      const states: CognitiveState[] = [
        { mode: 'peak', hour: 10, energy_level: 0.9, flow_score: 0.85 },
        { mode: 'dip', hour: 13 },
        { mode: 'morning' },
        { mode: 'evening' },
        { mode: 'deep_night' },
        { mode: 'flow' },
        { mode: 'distracted' },
        { mode: 'custom_mode' },
      ];
      expect(states).toHaveLength(8);
      expect(states[0].energy_level).toBe(0.9);
    });
  });

  describe('AgentCoreClientOptions', () => {
    it('should accept an empty options object', () => {
      const opts: AgentCoreClientOptions = {};
      expect(opts.baseUrl).toBeUndefined();
      expect(opts.project).toBeUndefined();
      expect(opts.timeout).toBeUndefined();
    });

    it('should accept all option fields', () => {
      const opts: AgentCoreClientOptions = {
        baseUrl: 'http://localhost:4000',
        project: 'test-project',
        timeout: 5000,
      };
      expect(opts.baseUrl).toBe('http://localhost:4000');
      expect(opts.timeout).toBe(5000);
    });
  });

  describe('PredictionOutcomeUpdate', () => {
    it('should accept all actual_outcome values', () => {
      const outcomes: PredictionOutcomeUpdate['actual_outcome'][] = [
        'success',
        'partial',
        'failed',
      ];
      expect(outcomes).toHaveLength(3);

      const update: PredictionOutcomeUpdate = {
        prediction_id: 'pred-001',
        actual_quality: 0.85,
        actual_outcome: 'success',
        session_id: 'sess-001',
      };
      expect(update.actual_quality).toBe(0.85);
    });
  });

  describe('CalibrationWeights', () => {
    it('should contain all weight fields', () => {
      const weights: CalibrationWeights = {
        outcome_weight: 0.4,
        cognitive_weight: 0.2,
        research_weight: 0.25,
        error_weight: 0.15,
        recommended_update: true,
      };
      expect(weights.outcome_weight + weights.cognitive_weight + weights.research_weight + weights.error_weight).toBe(1.0);
      expect(weights.recommended_update).toBe(true);
    });
  });
});
