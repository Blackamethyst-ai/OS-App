/**
 * Agent Core SDK Types
 * TypeScript interfaces for the Chief of Staff API
 */

// ============================================================
// Session Types
// ============================================================

export interface SessionSummary {
  id: string;
  topic: string | null;
  status: string;
  project: string | null;
  url_count: number;
  finding_count: number;
  created_at: string | null;
}

export interface SessionDetail extends SessionSummary {
  findings: Finding[];
  urls: CapturedUrl[];
  lineage: Lineage;
}

// ============================================================
// Finding Types
// ============================================================

export interface Finding {
  id: string;
  session_id: string;
  content: string;
  type: FindingType;
  confidence: number;
  sources: EvidenceSource[];
  needs_review: boolean;
}

export type FindingType =
  | 'thesis'
  | 'gap'
  | 'innovation'
  | 'finding'
  | 'implementation'
  | 'metrics'
  | 'milestone'
  | 'decision'
  | 'pattern';

export interface EvidenceSource {
  url: string;
  arxiv_id?: string;
  excerpt: string;
  relevance_score: number;
  verified: boolean;
  accessed_at?: string;
}

// ============================================================
// URL Types
// ============================================================

export interface CapturedUrl {
  url: string;
  tier: 1 | 2 | 3;
  category: string;
  context?: string;
  captured_at?: string;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchQuery {
  query: string;
  category?: 'all' | 'facts' | 'decisions' | 'patterns';
  limit?: number;
  min_confidence?: number;
  project?: string;
}

export interface SearchResult {
  content: string;
  category: string;
  similarity: number;
  session_id?: string;
  tags: string[];
}

// ============================================================
// Context Pack Types
// ============================================================

export interface ContextPack {
  id: string;
  type: string;
  tokens: number;
  sessions: number;
  created_at?: string;
}

export interface PackSelection {
  project?: string;
  pattern?: string;
  limit?: number;
}

export interface SelectedPacks {
  packs: Array<{
    id: string;
    type: string;
    tokens: number;
    content: string;
  }>;
  total_tokens: number;
  count: number;
}

// ============================================================
// Reinvigoration Types
// ============================================================

export interface ReinvigorationContext {
  session_id: string;
  metadata: SessionSummary;
  findings_count: number;
  urls_count: number;
  context_block: string;
  lineage: Lineage;
}

export interface Lineage {
  parent_sessions?: string[];
  papers?: Array<{
    arxiv_id?: string;
    id?: string;
  }>;
  implementation_project?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiHealth {
  service: string;
  version: string;
  status: 'healthy' | 'degraded';
  timestamp: string;
}

export interface CreateFindingRequest {
  content: string;
  type?: FindingType;
  project?: string;
  tags?: string[];
  source_url?: string;
}

export interface CreateFindingResponse {
  status: 'created';
  id: number;
  category: string;
}

// ============================================================
// Graph Intelligence Types
// ============================================================

export interface GraphNode {
  id: string;
  label: string;
  type: 'session' | 'finding' | 'paper' | 'concept' | string;
  relevance?: number;
  confidence?: number;
  url?: string;
  session_id?: string;
  project?: string;
  status?: string;
  isRoot?: boolean;
  tier?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'researched_in' | 'found_as' | 'contains' | 'cites' | 'references' | 'builds_on' | 'enables' | 'shares_reference' | 'produced' | string;
  paper?: string;
}

export interface RelatedConceptsResult {
  query: string;
  concepts: GraphNode[];
  edges: GraphEdge[];
  depth: number;
}

export interface SessionLineageResult {
  session_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

export interface SessionsGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  shared_papers: number;
}

// ============================================================
// Client Options
// ============================================================

export interface AgentCoreClientOptions {
  baseUrl?: string;
  project?: string;
  timeout?: number;
}
