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
  id?: string;
  title?: string;
  url?: string;
  relevance?: number;
  tier?: number;
  finding?: string;
  timestamp?: string;
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
// Meta-Learning Prediction Types (Phase 6)
// ============================================================

export interface CognitiveState {
  mode?: 'peak' | 'dip' | 'morning' | 'evening' | 'deep_night' | 'flow' | 'distracted' | string;
  hour?: number;
  energy_level?: number;
  flow_score?: number;
}

export interface PredictionRequest {
  intent: string;
  cognitive_state?: CognitiveState;
  available_research?: string[];
  track_prediction?: boolean;
}

export interface ErrorPattern {
  error_type: string;
  context: string;
  solution: string;
  success_rate: number;
  severity: 'high' | 'medium';
  score: number;
}

export interface SessionPrediction {
  predicted_quality: number;
  success_probability: number;
  optimal_time: number;
  recommended_research: SearchResult[];
  potential_errors: ErrorPattern[];
  similar_sessions: Array<{
    intent: string;
    outcome: string;
    quality: number;
    score?: number;
  }>;
  confidence: number;
  signals: {
    outcome_score: number;
    cognitive_alignment: number;
    research_availability: number;
    error_probability: number;
  };
  prediction_id?: string;
}

export interface ErrorPredictionRequest {
  intent: string;
  include_preventable_only?: boolean;
}

export interface ErrorPredictionResponse {
  errors: ErrorPattern[];
  count: number;
}

export interface OptimalTimeRequest {
  intent: string;
  current_hour?: number;
}

export interface OptimalTimeResponse {
  optimal_hour: number;
  is_optimal_now: boolean;
  wait_hours: number;
  reasoning: string;
}

export interface PredictionAccuracy {
  total_predictions: number;
  accurate_predictions: number;
  accuracy: number;
  avg_quality_error: number;
  success_prediction_rate: number;
  period_days: number;
}

export interface PredictionOutcomeUpdate {
  prediction_id: string;
  actual_quality: number;
  actual_outcome: 'success' | 'partial' | 'failed';
  session_id: string;
}

export interface MultiSearchResults {
  outcomes: any[];
  cognitive: any[];
  research: SearchResult[];
  errors: ErrorPattern[];
  total_results: number;
}

export interface CalibrationWeights {
  outcome_weight: number;
  cognitive_weight: number;
  research_weight: number;
  error_weight: number;
  recommended_update: boolean;
}

// ============================================================
// Client Options
// ============================================================

export interface AgentCoreClientOptions {
  baseUrl?: string;
  project?: string;
  timeout?: number;
}
