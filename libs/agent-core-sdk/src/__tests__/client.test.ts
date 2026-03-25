/**
 * Tests for AgentCoreClient
 *
 * Mocks the global fetch to test HTTP interactions, error handling,
 * query building, timeout logic, and all public methods.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentCoreClient, agentCore } from '../client';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockJsonResponse(data: unknown, status = 200, statusText = 'OK') {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(data),
  });
}

describe('AgentCoreClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // Construction
  // ============================================================

  describe('constructor', () => {
    it('should use default base URL and timeout when no options provided', () => {
      const client = new AgentCoreClient();
      // Trigger a request to verify the base URL
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'healthy' }));
      client.health();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3847/',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('should use custom options when provided', () => {
      const client = new AgentCoreClient({
        baseUrl: 'http://custom:9000',
        project: 'test-project',
        timeout: 5000,
      });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'healthy' }));
      client.health();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:9000/',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // fetch() method
  // ============================================================

  describe('fetch', () => {
    it('should return parsed JSON on successful response', async () => {
      const client = new AgentCoreClient();
      const mockData = { service: 'agent-core', version: '1.0', status: 'healthy' };
      mockFetch.mockReturnValueOnce(mockJsonResponse(mockData));

      const result = await client.fetch('/test');
      expect(result).toEqual(mockData);
    });

    it('should throw on non-OK response', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({}, 404, 'Not Found'));

      await expect(client.fetch('/missing')).rejects.toThrow('API error: 404 Not Found');
    });

    it('should throw on 500 server error', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({}, 500, 'Internal Server Error'));

      await expect(client.fetch('/broken')).rejects.toThrow('API error: 500 Internal Server Error');
    });

    it('should pass custom headers and method', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ ok: true }));

      await client.fetch('/api/test', {
        method: 'POST',
        headers: { 'X-Custom': 'value' },
        body: JSON.stringify({ data: true }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3847/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: true }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  // ============================================================
  // Health
  // ============================================================

  describe('health', () => {
    it('should call the root endpoint', async () => {
      const client = new AgentCoreClient();
      const healthData = { service: 'agent-core', version: '1.0', status: 'healthy', timestamp: '2026-01-01' };
      mockFetch.mockReturnValueOnce(mockJsonResponse(healthData));

      const result = await client.health();
      expect(result).toEqual(healthData);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3847/', expect.any(Object));
    });
  });

  describe('isHealthy', () => {
    it('should return true when status is healthy', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'healthy' }));

      const result = await client.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when status is degraded', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'degraded' }));

      const result = await client.isHealthy();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.isHealthy();
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // Sessions
  // ============================================================

  describe('listSessions', () => {
    it('should fetch sessions with query parameters', async () => {
      const client = new AgentCoreClient({ project: 'default-project' });
      const sessions = [{ id: 's1', topic: 'test', status: 'active' }];
      mockFetch.mockReturnValueOnce(mockJsonResponse(sessions));

      const result = await client.listSessions({ limit: 10, status: 'active' });
      expect(result).toEqual(sessions);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/sessions');
      expect(url).toContain('limit=10');
      expect(url).toContain('project=default-project');
      expect(url).toContain('status=active');
    });

    it('should use option project over default project', async () => {
      const client = new AgentCoreClient({ project: 'default-project' });
      mockFetch.mockReturnValueOnce(mockJsonResponse([]));

      await client.listSessions({ project: 'override-project' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('project=override-project');
    });

    it('should omit undefined query params', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse([]));

      await client.listSessions();

      const url = mockFetch.mock.calls[0][0] as string;
      // No query string when all params are undefined
      expect(url).toBe('http://localhost:3847/api/sessions');
    });
  });

  describe('getSession', () => {
    it('should fetch a session by ID', async () => {
      const client = new AgentCoreClient();
      const session = { id: 's1', findings: [], urls: [], lineage: {} };
      mockFetch.mockReturnValueOnce(mockJsonResponse(session));

      const result = await client.getSession('s1');
      expect(result).toEqual(session);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3847/api/sessions/s1',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // Findings
  // ============================================================

  describe('searchFindings', () => {
    it('should apply type and project filters', async () => {
      const client = new AgentCoreClient({ project: 'my-proj' });
      mockFetch.mockReturnValueOnce(mockJsonResponse([]));

      await client.searchFindings({ type: 'thesis', needs_review: true, limit: 5 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('type=thesis');
      expect(url).toContain('needs_review=true');
      expect(url).toContain('limit=5');
      expect(url).toContain('project=my-proj');
    });
  });

  describe('createFinding', () => {
    it('should POST a new finding with project fallback', async () => {
      const client = new AgentCoreClient({ project: 'default-proj' });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'created', id: 42, category: 'finding' }));

      const result = await client.createFinding({ content: 'New insight', type: 'thesis', tags: ['ai'] });
      expect(result).toEqual({ status: 'created', id: 42, category: 'finding' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.content).toBe('New insight');
      expect(body.project).toBe('default-proj');
      expect(body.type).toBe('thesis');
      expect(callArgs[1].method).toBe('POST');
    });

    it('should use request project over default', async () => {
      const client = new AgentCoreClient({ project: 'default-proj' });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'created', id: 1, category: 'finding' }));

      await client.createFinding({ content: 'test', project: 'explicit-proj' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.project).toBe('explicit-proj');
    });
  });

  // ============================================================
  // Semantic Search
  // ============================================================

  describe('semanticSearch', () => {
    it('should POST search query with project fallback', async () => {
      const client = new AgentCoreClient({ project: 'os-app' });
      const results = [{ content: 'match', category: 'facts', similarity: 0.9, tags: [] }];
      mockFetch.mockReturnValueOnce(mockJsonResponse(results));

      const result = await client.semanticSearch({ query: 'agents', limit: 3 });
      expect(result).toEqual(results);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toBe('agents');
      expect(body.project).toBe('os-app');
    });
  });

  describe('search (convenience)', () => {
    it('should delegate to semanticSearch', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse([]));

      await client.search('test query', { limit: 2, category: 'decisions' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toBe('test query');
      expect(body.limit).toBe(2);
      expect(body.category).toBe('decisions');
    });
  });

  // ============================================================
  // Context Packs
  // ============================================================

  describe('listPacks', () => {
    it('should GET /api/packs', async () => {
      const client = new AgentCoreClient();
      const packs = [{ id: 'p1', type: 'session', tokens: 500, sessions: 3 }];
      mockFetch.mockReturnValueOnce(mockJsonResponse(packs));

      const result = await client.listPacks();
      expect(result).toEqual(packs);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3847/api/packs', expect.any(Object));
    });
  });

  describe('selectPacks', () => {
    it('should POST with project fallback', async () => {
      const client = new AgentCoreClient({ project: 'os-app' });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ packs: [], total_tokens: 0, count: 0 }));

      await client.selectPacks({ limit: 3 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.project).toBe('os-app');
      expect(body.limit).toBe(3);
    });
  });

  // ============================================================
  // Reinvigoration
  // ============================================================

  describe('getReinvigorationContext', () => {
    it('should fetch reinvigoration context by session ID', async () => {
      const client = new AgentCoreClient();
      const ctx = { session_id: 'sess-1', context_block: 'context...', lineage: {} };
      mockFetch.mockReturnValueOnce(mockJsonResponse(ctx));

      const result = await client.getReinvigorationContext('sess-1');
      expect(result).toEqual(ctx);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3847/api/reinvigorate/sess-1',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // getRelevantContext
  // ============================================================

  describe('getRelevantContext', () => {
    it('should combine search results, findings, and packs', async () => {
      const client = new AgentCoreClient();
      const searchResults = [{ content: 'r1', category: 'facts', similarity: 0.9, tags: [] }];
      const findings = [{ id: 'f1', content: 'finding' }];
      const packs = { packs: [], total_tokens: 0, count: 0 };

      // semanticSearch, searchFindings, selectPacks called in parallel
      mockFetch
        .mockReturnValueOnce(mockJsonResponse(searchResults))
        .mockReturnValueOnce(mockJsonResponse(findings))
        .mockReturnValueOnce(mockJsonResponse(packs));

      const result = await client.getRelevantContext('test', {
        includeFindings: true,
        includePacks: true,
      });

      expect(result.searchResults).toEqual(searchResults);
      expect(result.findings).toEqual(findings);
      expect(result.packs).toEqual(packs);
    });

    it('should exclude findings and packs when not requested', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse([]));

      const result = await client.getRelevantContext('test', {
        includeFindings: false,
        includePacks: false,
      });

      expect(result.searchResults).toEqual([]);
      expect(result.findings).toBeUndefined();
      expect(result.packs).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only semantic search
    });
  });

  // ============================================================
  // logInsight
  // ============================================================

  describe('logInsight', () => {
    it('should create a finding with defaults', async () => {
      const client = new AgentCoreClient({ project: 'os-app' });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'created', id: 1, category: 'finding' }));

      await client.logInsight('Important discovery');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.content).toBe('Important discovery');
      expect(body.type).toBe('finding');
      expect(body.tags).toEqual([]);
      expect(body.project).toBe('os-app');
    });
  });

  // ============================================================
  // Graph Intelligence
  // ============================================================

  describe('getRelatedConcepts', () => {
    it('should build query params with defaults', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ query: 'ai', concepts: [], edges: [], depth: 2 }));

      await client.getRelatedConcepts('ai');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('query=ai');
      expect(url).toContain('depth=2');
      expect(url).toContain('limit=20');
    });
  });

  describe('getSessionLineage', () => {
    it('should include findings and papers by default', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ session_id: 's1', nodes: [], edges: [] }));

      await client.getSessionLineage('s1');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/graph/lineage/s1');
      expect(url).toContain('include_findings=true');
      expect(url).toContain('include_papers=true');
    });
  });

  describe('getSessionsGraph', () => {
    it('should use project fallback and default limit', async () => {
      const client = new AgentCoreClient({ project: 'os-app' });
      mockFetch.mockReturnValueOnce(mockJsonResponse({ nodes: [], edges: [], shared_papers: 0 }));

      await client.getSessionsGraph();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('limit=30');
      expect(url).toContain('project=os-app');
    });
  });

  // ============================================================
  // Meta-Learning Predictions
  // ============================================================

  describe('predictSession', () => {
    it('should POST to v2 predict endpoint', async () => {
      const client = new AgentCoreClient();
      const prediction = { predicted_quality: 0.8, success_probability: 0.75, confidence: 0.7 };
      mockFetch.mockReturnValueOnce(mockJsonResponse(prediction));

      const result = await client.predictSession({ intent: 'debug code', track_prediction: true });
      expect(result).toEqual(prediction);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.intent).toBe('debug code');
      expect(body.track_prediction).toBe(true);
    });
  });

  describe('predictErrors', () => {
    it('should POST error prediction request', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ errors: [], count: 0 }));

      await client.predictErrors({ intent: 'refactor', include_preventable_only: true });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/v2/predict/errors');
    });
  });

  describe('predictOptimalTime', () => {
    it('should POST optimal time request', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ optimal_hour: 10, is_optimal_now: true, wait_hours: 0, reasoning: 'peak' }));

      const result = await client.predictOptimalTime({ intent: 'architecture', current_hour: 10 });
      expect(result.is_optimal_now).toBe(true);
    });
  });

  describe('getPredictionAccuracy', () => {
    it('should use default 30 days', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ total_predictions: 10, accuracy: 0.8 }));

      await client.getPredictionAccuracy();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('days=30');
    });

    it('should accept custom days', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ total_predictions: 5, accuracy: 0.9 }));

      await client.getPredictionAccuracy(7);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('days=7');
    });
  });

  describe('updatePredictionOutcome', () => {
    it('should POST outcome update', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'updated', prediction_id: 'p1' }));

      const result = await client.updatePredictionOutcome({
        prediction_id: 'p1',
        actual_quality: 0.9,
        actual_outcome: 'success',
        session_id: 's1',
      });
      expect(result.prediction_id).toBe('p1');
    });
  });

  describe('multiVectorSearch', () => {
    it('should build query params', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ outcomes: [], cognitive: [], research: [], errors: [], total_results: 0 }));

      await client.multiVectorSearch('agents', 10);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('query=agents');
      expect(url).toContain('limit=10');
    });
  });

  describe('calibrateWeights', () => {
    it('should GET calibrate-weights endpoint', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ outcome_weight: 0.4, recommended_update: false }));

      await client.calibrateWeights();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3847/api/v2/predict/calibrate-weights',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // getPredictionWithContext
  // ============================================================

  describe('getPredictionWithContext', () => {
    it('should combine prediction, errors, and optimal time', async () => {
      const client = new AgentCoreClient();
      const prediction = { predicted_quality: 0.8 };
      const errors = { errors: [], count: 0 };
      const optimalTime = { optimal_hour: 10, is_optimal_now: true, wait_hours: 0, reasoning: '' };

      mockFetch
        .mockReturnValueOnce(mockJsonResponse(prediction))
        .mockReturnValueOnce(mockJsonResponse(errors))
        .mockReturnValueOnce(mockJsonResponse(optimalTime));

      const result = await client.getPredictionWithContext('debug code');
      expect(result.prediction).toEqual(prediction);
      expect(result.errors).toEqual(errors);
      expect(result.optimalTime).toEqual(optimalTime);
    });

    it('should exclude optional parts when disabled', async () => {
      const client = new AgentCoreClient();
      mockFetch.mockReturnValueOnce(mockJsonResponse({ predicted_quality: 0.8 }));

      const result = await client.getPredictionWithContext('test', {
        includeErrors: false,
        includeOptimalTime: false,
      });
      expect(result.errors).toBeUndefined();
      expect(result.optimalTime).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Default export
  // ============================================================

  describe('agentCore default instance', () => {
    it('should be an instance of AgentCoreClient', () => {
      expect(agentCore).toBeInstanceOf(AgentCoreClient);
    });
  });
});
