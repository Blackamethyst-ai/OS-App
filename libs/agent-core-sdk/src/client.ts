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
}

// Default client instance
export const agentCore = new AgentCoreClient();
