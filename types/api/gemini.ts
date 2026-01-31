/**
 * Gemini API Types
 *
 * Type definitions for Gemini API responses and related structures.
 */

import type { Content, Part } from '@google/genai';

// ============================================================================
// Common Response Types
// ============================================================================

export interface GeminiWebSource {
  title: string;
  uri: string;
}

export interface GeminiGroundingChunk {
  web?: GeminiWebSource;
}

export interface GeminiInlineData {
  mimeType: string;
  data: string;
}

export interface GeminiInlineDataPart {
  inlineData: GeminiInlineData;
}

export interface GeminiTextPart {
  text: string;
}

export type GeminiPart = GeminiTextPart | GeminiInlineDataPart | Part;

// ============================================================================
// Action Prediction Types
// ============================================================================

export interface PredictedAction {
  action: string;
  target?: string;
  parameters?: Record<string, unknown>;
  reasoning: string;
}

export interface ActionPredictionContext {
  mode?: string;
  recentLogs?: string[];
  userIntent?: string;
  currentState?: Record<string, unknown>;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowProtocol {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

export interface WorkflowTaxonomy {
  root?: WorkflowProtocol[];
}

export interface GeneratedWorkflow {
  title: string;
  internalPlanningMonologue: string;
  protocols: WorkflowProtocol[];
  coherenceScore: number;
  taxonomy?: WorkflowTaxonomy;
}

// ============================================================================
// Hardware Types
// ============================================================================

export interface HardwareBomItem {
  name: string;
  quantity?: number;
  description?: string;
  specs?: Record<string, string>;
}

export interface DeploymentManifest {
  summary: string;
  steps: string[];
  requirements: string[];
}

// ============================================================================
// Image Generation Types
// ============================================================================

export interface ColorwayConfig {
  primary?: string;
  secondary?: string;
  accent?: string;
  mood?: string;
}

export interface ImageGenerationConfig {
  prompt: string;
  colorway?: ColorwayConfig;
  hasCharacter?: boolean;
  hasWorld?: boolean;
  hasStyle?: boolean;
  bibleNotes?: string;
  preset?: string;
}

// ============================================================================
// Research Types
// ============================================================================

export interface ResearchTask {
  id: string;
  title: string;
  description?: string;
  sources?: string[];
  findings?: string[];
}

export interface ResearchReport {
  summary: string;
  findings: string[];
  recommendations: string[];
  sources: GeminiWebSource[];
}

// ============================================================================
// Artifact Types
// ============================================================================

export interface ArtifactContent {
  type: 'IMAGE' | 'CODE' | 'TEXT' | 'DATA';
  data: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface OrganizedArtifact {
  category: string;
  subcategory?: string;
  tags: string[];
  priority: number;
}

// ============================================================================
// Graph/Node Types
// ============================================================================

export interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface EntropyResult {
  score: number;
  analysis: string;
  recommendations?: string[];
}

export interface LayoutResult {
  nodes: GraphNode[];
  edges?: GraphEdge[];
  bounds?: { width: number; height: number };
}

export interface LatticeConvergenceResult {
  nodes: GraphNode[];
  coherence_index: number;
  unified_goal: string;
}

// ============================================================================
// Map Context Types
// ============================================================================

export interface MapContext {
  prompt?: string;
  dna?: Record<string, unknown>;
  files?: unknown[];
  governance?: string;
}

// ============================================================================
// Inventory Types
// ============================================================================

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface CrossSectorImpact {
  sectors: string[];
  impact: string;
  recommendations: string[];
}

// ============================================================================
// Neural Policy Types
// ============================================================================

export interface NeuralPolicyResult {
  ok: boolean;
  action?: string;
  parameters?: Record<string, unknown>;
  error?: unknown;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isInlineDataPart(part: GeminiPart): part is GeminiInlineDataPart {
  return 'inlineData' in part && part.inlineData !== undefined;
}

export function isTextPart(part: GeminiPart): part is GeminiTextPart {
  return 'text' in part && typeof part.text === 'string';
}

export function hasWebSource(chunk: GeminiGroundingChunk): chunk is { web: GeminiWebSource } {
  return chunk.web !== undefined;
}
