/**
 * ARCHON Meta-Cognition Types
 *
 * Types for multi-modal model orchestration and capability-based selection.
 * Supports Claude, Gemini, GPT-4, Grok, and local models.
 */

import { SubsystemType, Priority } from '../types';

// =============================================================================
// MODEL PROVIDERS
// =============================================================================

export type ModelProvider =
  | 'deepseek'    // DeepSeek models (primary)
  | 'anthropic'   // Claude models
  | 'google'      // Gemini models
  | 'openai'      // GPT models
  | 'xai'         // Grok models
  | 'local'       // Ollama, LM Studio, etc.
  | 'custom';     // User-defined endpoints

export type ModelTier = 'flagship' | 'standard' | 'fast' | 'local';

export interface ModelInfo {
  id: string;
  provider: ModelProvider;
  name: string;
  tier: ModelTier;

  // Capabilities
  capabilities: ModelCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;

  // Cost (per 1M tokens)
  inputCostPer1M: number;
  outputCostPer1M: number;

  // Performance metrics (updated dynamically)
  metrics: ModelMetrics;

  // Availability
  available: boolean;
  rateLimitRemaining?: number;
  rateLimitResetsAt?: number;
}

export type ModelCapability =
  | 'reasoning'           // Complex multi-step reasoning
  | 'coding'              // Code generation and analysis
  | 'creative'            // Creative writing, brainstorming
  | 'analysis'            // Data analysis, summarization
  | 'vision'              // Image understanding
  | 'fast-response'       // Low latency responses
  | 'long-context'        // Large context windows
  | 'tool-use'            // Function calling
  | 'structured-output'   // JSON mode, schema adherence
  | 'math'                // Mathematical reasoning
  | 'multilingual';       // Non-English languages

export interface ModelMetrics {
  avgLatencyMs: number;
  avgDqScore: number;
  successRate: number;
  totalInvocations: number;
  lastUsed?: number;

  // Per-capability performance
  capabilityScores: Map<ModelCapability, number>;
}

// =============================================================================
// MODEL REGISTRY
// =============================================================================

export interface ModelRegistryConfig {
  // Which providers are enabled
  enabledProviders: ModelProvider[];

  // API keys (usually from env)
  apiKeys: Partial<Record<ModelProvider, string>>;

  // Default model per tier
  defaultModels: Record<ModelTier, string>;

  // Cost limits
  maxCostPerTask: number;
  maxCostPerSession: number;

  // Fallback chain
  fallbackChain: string[]; // Model IDs in order of preference
}

// =============================================================================
// CAPABILITY GAP ANALYSIS
// =============================================================================

export interface CapabilityRequirement {
  capability: ModelCapability | string;
  importance: 'required' | 'preferred' | 'optional';
  minimumScore: number; // 0-1
}

export interface GapAnalysis {
  taskId: string;
  requirements: CapabilityRequirement[];
  availableModels: ModelMatch[];
  gaps: CapabilityGap[];
  recommendation: SelectionRecommendation;
}

export interface ModelMatch {
  modelId: string;
  overallScore: number;
  capabilityScores: Map<string, number>;
  estimatedCost: number;
  estimatedLatency: number;
}

export interface CapabilityGap {
  capability: string;
  required: number;
  bestAvailable: number;
  severity: 'critical' | 'significant' | 'minor';
  workaround?: string;
}

export interface SelectionRecommendation {
  primaryModel: string;
  fallbackModel?: string;
  reasoning: string;
  confidence: number;
  estimatedCost: number;
  warnings: string[];
}

// =============================================================================
// DYNAMIC MIXTURE OF EXPERTS (DMoE)
// =============================================================================

export interface ExpertProfile {
  modelId: string;
  specializations: ModelCapability[];
  strengthScore: number; // 0-1
  costEfficiency: number; // DQ per dollar
  recentPerformance: number[]; // Last N DQ scores
}

export interface ExpertSelection {
  experts: SelectedExpert[];
  strategy: SelectionStrategy;
  reasoning: string;
}

export interface SelectedExpert {
  modelId: string;
  role: 'primary' | 'verifier' | 'specialist';
  weight: number; // For ensemble voting
  taskAssignment?: string;
}

export type SelectionStrategy =
  | 'single-best'       // One model handles everything
  | 'specialist-route'  // Route to domain specialist
  | 'ensemble-vote'     // Multiple models vote
  | 'cascade'           // Fast model first, escalate if needed
  | 'parallel-race';    // Race multiple, take best

// =============================================================================
// CONTEXT MANAGEMENT
// =============================================================================

export interface ContextWindow {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  segments: ContextSegment[];
}

export interface ContextSegment {
  id: string;
  type: 'system' | 'goal' | 'history' | 'result' | 'tool' | 'user';
  content: string;
  tokens: number;
  relevanceScore: number;
  timestamp: number;
  canPrune: boolean;
}

export interface PruningResult {
  originalTokens: number;
  prunedTokens: number;
  removedSegments: string[];
  strategy: PruningStrategy;
}

export type PruningStrategy =
  | 'lru'               // Least recently used
  | 'relevance'         // Lowest relevance score
  | 'surgical'          // Smart selective pruning
  | 'summarize';        // Compress to summary

// =============================================================================
// TASK-MODEL MAPPING
// =============================================================================

export interface TaskProfile {
  type: string;
  complexity: number;
  requiredCapabilities: CapabilityRequirement[];
  preferredTier: ModelTier;
  contextNeeds: 'minimal' | 'moderate' | 'extensive';
  latencySensitive: boolean;
  costSensitive: boolean;
}

export const TASK_PROFILES: Record<string, Partial<TaskProfile>> = {
  // Simple tasks - use fast models
  'simple-query': {
    preferredTier: 'fast',
    contextNeeds: 'minimal',
    latencySensitive: true,
    costSensitive: true,
  },

  // Code generation - use flagship with coding capability
  'code-generation': {
    preferredTier: 'flagship',
    requiredCapabilities: [
      { capability: 'coding', importance: 'required', minimumScore: 0.8 },
      { capability: 'reasoning', importance: 'preferred', minimumScore: 0.7 },
    ],
    contextNeeds: 'extensive',
  },

  // Architecture decisions - use flagship with consensus
  'architecture': {
    preferredTier: 'flagship',
    requiredCapabilities: [
      { capability: 'reasoning', importance: 'required', minimumScore: 0.9 },
      { capability: 'coding', importance: 'required', minimumScore: 0.8 },
    ],
    contextNeeds: 'extensive',
    latencySensitive: false,
  },

  // Research - use models with long context
  'research': {
    preferredTier: 'standard',
    requiredCapabilities: [
      { capability: 'long-context', importance: 'required', minimumScore: 0.8 },
      { capability: 'analysis', importance: 'required', minimumScore: 0.7 },
    ],
    contextNeeds: 'extensive',
  },

  // Quick validation - use fast models
  'validation': {
    preferredTier: 'fast',
    contextNeeds: 'minimal',
    latencySensitive: true,
  },

  // Creative tasks
  'creative': {
    preferredTier: 'flagship',
    requiredCapabilities: [
      { capability: 'creative', importance: 'required', minimumScore: 0.8 },
    ],
    contextNeeds: 'moderate',
  },

  // Vision tasks
  'vision': {
    preferredTier: 'flagship',
    requiredCapabilities: [
      { capability: 'vision', importance: 'required', minimumScore: 0.9 },
    ],
    contextNeeds: 'minimal',
  },
};

// =============================================================================
// META-COGNITION STATE
// =============================================================================

export interface MetaCognitionState {
  // Active models
  availableModels: Map<string, ModelInfo>;

  // Expert profiles (learned over time)
  expertProfiles: Map<string, ExpertProfile>;

  // Current context
  contextWindow: ContextWindow;

  // Session stats
  sessionStats: SessionStats;
}

export interface SessionStats {
  totalTasks: number;
  modelsUsed: Map<string, number>;
  totalCost: number;
  avgDqScore: number;
  avgLatencyMs: number;
  selectionAccuracy: number; // How often first choice succeeded
}
