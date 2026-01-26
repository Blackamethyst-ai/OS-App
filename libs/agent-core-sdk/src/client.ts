/**
 * Agent Core API Client
 * HTTP client for the Chief of Staff API
 */

import type {
  AgentCoreClientOptions,
  SessionSummary,
  SessionDetail,
  Finding,
  SearchQuery,
  SearchResult,
  ContextPack,
  PackSelection,
  SelectedPacks,
  ReinvigorationContext,
  ApiHealth,
  CreateFindingRequest,
  CreateFindingResponse,
  RelatedConceptsResult,
  SessionLineageResult,
  SessionsGraphResult,
  PredictionRequest,
  SessionPrediction,
  ErrorPredictionRequest,
  ErrorPredictionResponse,
  OptimalTimeRequest,
  OptimalTimeResponse,
  PredictionAccuracy,
  PredictionOutcomeUpdate,
  MultiSearchResults,
  CalibrationWeights,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:3847';
const DEFAULT_TIMEOUT = 10000;

export class AgentCoreClient {
  private baseUrl: string;
  private project?: string;
  private timeout: number;

  constructor(options: AgentCoreClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.project = options.project;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  // ============================================================
  // HTTP Helpers
  // ============================================================

  /**
   * Generic fetch method for API calls
   * Made public for custom endpoint access
   */
  async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildQuery(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  // ============================================================
  // Health Check
  // ============================================================

  async health(): Promise<ApiHealth> {
    return this.fetch<ApiHealth>('/');
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.health();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  // ============================================================
  // Sessions
  // ============================================================

  async listSessions(options: {
    limit?: number;
    project?: string;
    status?: string;
  } = {}): Promise<SessionSummary[]> {
    const query = this.buildQuery({
      limit: options.limit,
      project: options.project || this.project,
      status: options.status,
    });
    return this.fetch<SessionSummary[]>(`/api/sessions${query}`);
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.fetch<SessionDetail>(`/api/sessions/${sessionId}`);
  }

  // ============================================================
  // Findings
  // ============================================================

  async searchFindings(options: {
    type?: string;
    project?: string;
    needs_review?: boolean;
    limit?: number;
  } = {}): Promise<Finding[]> {
    const query = this.buildQuery({
      type: options.type,
      project: options.project || this.project,
      needs_review: options.needs_review,
      limit: options.limit,
    });
    return this.fetch<Finding[]>(`/api/findings${query}`);
  }

  async createFinding(finding: CreateFindingRequest): Promise<CreateFindingResponse> {
    return this.fetch<CreateFindingResponse>('/api/findings', {
      method: 'POST',
      body: JSON.stringify({
        ...finding,
        project: finding.project || this.project,
      }),
    });
  }

  // ============================================================
  // Semantic Search
  // ============================================================

  async semanticSearch(query: SearchQuery): Promise<SearchResult[]> {
    return this.fetch<SearchResult[]>('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({
        ...query,
        project: query.project || this.project,
      }),
    });
  }

  /**
   * Convenience method for quick semantic search
   */
  async search(
    query: string,
    options: Omit<SearchQuery, 'query'> = {}
  ): Promise<SearchResult[]> {
    return this.semanticSearch({ query, ...options });
  }

  // ============================================================
  // Context Packs
  // ============================================================

  async listPacks(): Promise<ContextPack[]> {
    return this.fetch<ContextPack[]>('/api/packs');
  }

  async selectPacks(selection: PackSelection = {}): Promise<SelectedPacks> {
    return this.fetch<SelectedPacks>('/api/packs/select', {
      method: 'POST',
      body: JSON.stringify({
        ...selection,
        project: selection.project || this.project,
      }),
    });
  }

  // ============================================================
  // Reinvigoration
  // ============================================================

  async getReinvigorationContext(sessionId: string): Promise<ReinvigorationContext> {
    return this.fetch<ReinvigorationContext>(`/api/reinvigorate/${sessionId}`);
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Get relevant context for the current project/query
   */
  async getRelevantContext(query: string, options: {
    limit?: number;
    includeFindings?: boolean;
    includePacks?: boolean;
  } = {}): Promise<{
    searchResults: SearchResult[];
    findings?: Finding[];
    packs?: SelectedPacks;
  }> {
    const { limit = 5, includeFindings = true, includePacks = false } = options;

    const promises: Promise<unknown>[] = [
      this.semanticSearch({ query, limit }),
    ];

    if (includeFindings) {
      promises.push(this.searchFindings({ limit }));
    }

    if (includePacks) {
      promises.push(this.selectPacks({ limit }));
    }

    const results = await Promise.all(promises);

    return {
      searchResults: results[0] as SearchResult[],
      findings: includeFindings ? (results[1] as Finding[]) : undefined,
      packs: includePacks ? (results[includeFindings ? 2 : 1] as SelectedPacks) : undefined,
    };
  }

  /**
   * Log an insight from the application
   */
  async logInsight(
    content: string,
    type: string = 'finding',
    tags: string[] = []
  ): Promise<CreateFindingResponse> {
    return this.createFinding({
      content,
      type: type as CreateFindingRequest['type'],
      tags,
      project: this.project,
    });
  }

  // ============================================================
  // Graph Intelligence
  // ============================================================

  /**
   * Find concepts related to a query
   */
  async getRelatedConcepts(
    query: string,
    options: { depth?: number; limit?: number } = {}
  ): Promise<RelatedConceptsResult> {
    const params = this.buildQuery({
      query,
      depth: options.depth || 2,
      limit: options.limit || 20,
    });
    return this.fetch<RelatedConceptsResult>(`/api/graph/concepts${params}`);
  }

  /**
   * Get session lineage graph
   */
  async getSessionLineage(
    sessionId: string,
    options: { includeFindings?: boolean; includePapers?: boolean } = {}
  ): Promise<SessionLineageResult> {
    const params = this.buildQuery({
      include_findings: options.includeFindings ?? true,
      include_papers: options.includePapers ?? true,
    });
    return this.fetch<SessionLineageResult>(`/api/graph/lineage/${sessionId}${params}`);
  }

  /**
   * Get graph of all sessions with connections
   */
  async getSessionsGraph(
    options: { limit?: number; project?: string } = {}
  ): Promise<SessionsGraphResult> {
    const params = this.buildQuery({
      limit: options.limit || 30,
      project: options.project || this.project,
    });
    return this.fetch<SessionsGraphResult>(`/api/graph/sessions${params}`);
  }

  // ============================================================
  // Meta-Learning Predictions (Phase 6)
  // ============================================================

  /**
   * Predict session outcome based on multi-dimensional correlation
   * Analyzes historical outcomes, cognitive state, available research, and error patterns
   */
  async predictSession(request: PredictionRequest): Promise<SessionPrediction> {
    return this.fetch<SessionPrediction>('/api/v2/predict/session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Predict potential errors for a given task intent
   * Returns preventable error patterns with solutions
   */
  async predictErrors(request: ErrorPredictionRequest): Promise<ErrorPredictionResponse> {
    return this.fetch<ErrorPredictionResponse>('/api/v2/predict/errors', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Find optimal time for a task based on cognitive patterns
   */
  async predictOptimalTime(request: OptimalTimeRequest): Promise<OptimalTimeResponse> {
    return this.fetch<OptimalTimeResponse>('/api/v2/predict/optimal-time', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get prediction accuracy metrics for calibration
   */
  async getPredictionAccuracy(days: number = 30): Promise<PredictionAccuracy> {
    const params = this.buildQuery({ days });
    return this.fetch<PredictionAccuracy>(`/api/v2/predict/accuracy${params}`);
  }

  /**
   * Update a prediction with actual outcome for calibration loop
   */
  async updatePredictionOutcome(
    update: PredictionOutcomeUpdate
  ): Promise<{ status: string; prediction_id: string }> {
    return this.fetch('/api/v2/predict/update-outcome', {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  /**
   * Multi-dimensional semantic search across outcomes, cognitive states, research, and errors
   */
  async multiVectorSearch(query: string, limit: number = 5): Promise<MultiSearchResults> {
    const params = this.buildQuery({ query, limit });
    return this.fetch<MultiSearchResults>(`/api/v2/predict/multi-search${params}`);
  }

  /**
   * Get recommended calibration weights based on prediction accuracy
   */
  async calibrateWeights(): Promise<CalibrationWeights> {
    return this.fetch<CalibrationWeights>('/api/v2/predict/calibrate-weights');
  }

  /**
   * Convenience method: Get prediction with current cognitive state
   * Automatically includes error prediction and optimal timing
   */
  async getPredictionWithContext(
    intent: string,
    options: {
      track?: boolean;
      includeErrors?: boolean;
      includeOptimalTime?: boolean;
    } = {}
  ): Promise<{
    prediction: SessionPrediction;
    errors?: ErrorPredictionResponse;
    optimalTime?: OptimalTimeResponse;
  }> {
    const { track = false, includeErrors = true, includeOptimalTime = true } = options;

    const promises: Promise<unknown>[] = [
      this.predictSession({ intent, track_prediction: track }),
    ];

    if (includeErrors) {
      promises.push(this.predictErrors({ intent, include_preventable_only: true }));
    }

    if (includeOptimalTime) {
      promises.push(this.predictOptimalTime({ intent }));
    }

    const results = await Promise.all(promises);

    return {
      prediction: results[0] as SessionPrediction,
      errors: includeErrors ? (results[1] as ErrorPredictionResponse) : undefined,
      optimalTime: includeOptimalTime
        ? (results[includeErrors ? 2 : 1] as OptimalTimeResponse)
        : undefined,
    };
  }
}

// Default client instance
export const agentCore = new AgentCoreClient();
