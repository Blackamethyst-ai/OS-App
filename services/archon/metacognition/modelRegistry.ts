/**
 * ARCHON Model Registry
 *
 * Central registry of all available AI models across providers.
 * Supports Claude, Gemini, GPT-4, Grok, and local models.
 */

import {
  ModelInfo,
  ModelProvider,
  ModelTier,
  ModelCapability,
  ModelMetrics,
  ModelRegistryConfig,
} from './types';
import { archonLog } from '../utils';

// =============================================================================
// DEFAULT MODEL DEFINITIONS
// =============================================================================

const createDefaultMetrics = (): ModelMetrics => ({
  avgLatencyMs: 0,
  avgDqScore: 0,
  successRate: 1.0,
  totalInvocations: 0,
  capabilityScores: new Map(),
});

/**
 * Built-in model definitions
 */
export const BUILT_IN_MODELS: ModelInfo[] = [
  // ==========================================================================
  // ANTHROPIC (Claude)
  // ==========================================================================
  {
    id: 'claude-opus-4',
    provider: 'anthropic',
    name: 'Claude Opus 4',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'tool-use', 'structured-output', 'math', 'long-context'],
    contextWindow: 200000,
    maxOutputTokens: 32000,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 15,
    outputCostPer1M: 75,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    tier: 'standard',
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'tool-use', 'structured-output', 'long-context'],
    contextWindow: 200000,
    maxOutputTokens: 16000,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 3,
    outputCostPer1M: 15,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'claude-haiku-3.5',
    provider: 'anthropic',
    name: 'Claude Haiku 3.5',
    tier: 'fast',
    capabilities: ['coding', 'analysis', 'tool-use', 'structured-output', 'fast-response'],
    contextWindow: 200000,
    maxOutputTokens: 8000,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
    metrics: createDefaultMetrics(),
    available: true,
  },

  // ==========================================================================
  // GOOGLE (Gemini)
  // ==========================================================================
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    tier: 'standard',
    capabilities: ['reasoning', 'coding', 'analysis', 'vision', 'tool-use', 'fast-response', 'long-context'],
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'gemini-2.0-flash-thinking',
    provider: 'google',
    name: 'Gemini 2.0 Flash Thinking',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'math', 'analysis', 'tool-use'],
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'vision', 'tool-use', 'long-context'],
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
    metrics: createDefaultMetrics(),
    available: true,
  },

  // ==========================================================================
  // OPENAI (GPT)
  // ==========================================================================
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'vision', 'tool-use', 'structured-output'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    tier: 'fast',
    capabilities: ['coding', 'analysis', 'tool-use', 'structured-output', 'fast-response'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'o1',
    provider: 'openai',
    name: 'o1',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'math', 'analysis'],
    contextWindow: 200000,
    maxOutputTokens: 100000,
    supportsVision: true,
    supportsTools: false,
    supportsStreaming: false,
    inputCostPer1M: 15,
    outputCostPer1M: 60,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'o3-mini',
    provider: 'openai',
    name: 'o3-mini',
    tier: 'standard',
    capabilities: ['reasoning', 'coding', 'math'],
    contextWindow: 200000,
    maxOutputTokens: 100000,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: false,
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    metrics: createDefaultMetrics(),
    available: true,
  },

  // ==========================================================================
  // XAI (Grok)
  // ==========================================================================
  {
    id: 'grok-3',
    provider: 'xai',
    name: 'Grok 2',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'creative', 'analysis', 'vision'],
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 2,
    outputCostPer1M: 10,
    metrics: createDefaultMetrics(),
    available: true,
  },
  {
    id: 'grok-3-vision',
    provider: 'xai',
    name: 'Grok 2 Vision',
    tier: 'flagship',
    capabilities: ['reasoning', 'vision', 'analysis'],
    contextWindow: 32768,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 2,
    outputCostPer1M: 10,
    metrics: createDefaultMetrics(),
    available: true,
  },

  // ==========================================================================
  // LOCAL MODELS (Ollama, LM Studio)
  // ==========================================================================
  {
    id: 'llama-3.3-70b',
    provider: 'local',
    name: 'Llama 3.3 70B',
    tier: 'standard',
    capabilities: ['reasoning', 'coding', 'analysis', 'tool-use'],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0, // Local = free
    outputCostPer1M: 0,
    metrics: createDefaultMetrics(),
    available: false, // Requires local setup
  },
  {
    id: 'qwen-2.5-coder-32b',
    provider: 'local',
    name: 'Qwen 2.5 Coder 32B',
    tier: 'standard',
    capabilities: ['coding', 'analysis', 'tool-use'],
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    metrics: createDefaultMetrics(),
    available: false,
  },
  {
    id: 'deepseek-r1',
    provider: 'local',
    name: 'DeepSeek R1',
    tier: 'flagship',
    capabilities: ['reasoning', 'coding', 'math', 'analysis'],
    contextWindow: 64000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    metrics: createDefaultMetrics(),
    available: false,
  },
];

// =============================================================================
// MODEL REGISTRY CLASS
// =============================================================================

export class ModelRegistry {
  private models: Map<string, ModelInfo> = new Map();
  private config: ModelRegistryConfig;

  constructor(config?: Partial<ModelRegistryConfig>) {
    this.config = {
      enabledProviders: config?.enabledProviders ?? ['anthropic', 'google', 'openai', 'xai'],
      apiKeys: config?.apiKeys ?? {},
      defaultModels: config?.defaultModels ?? {
        flagship: 'claude-opus-4',
        standard: 'claude-sonnet-4',
        fast: 'claude-haiku-3.5',
        local: 'llama-3.3-70b',
      },
      maxCostPerTask: config?.maxCostPerTask ?? 1.0,
      maxCostPerSession: config?.maxCostPerSession ?? 10.0,
      fallbackChain: config?.fallbackChain ?? [
        'claude-sonnet-4',
        'gemini-2.0-flash',
        'gpt-4o-mini',
      ],
    };

    this.initializeModels();
  }

  /**
   * Initialize models from built-in definitions
   */
  private initializeModels(): void {
    for (const model of BUILT_IN_MODELS) {
      if (this.config.enabledProviders.includes(model.provider)) {
        // Check if API key is available for cloud providers
        const needsKey = model.provider !== 'local';
        const hasKey = !!this.config.apiKeys[model.provider];

        this.models.set(model.id, {
          ...model,
          available: needsKey ? hasKey : model.available,
        });
      }
    }

    archonLog('info', `ModelRegistry initialized with ${this.models.size} models`);
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelInfo[] {
    return Array.from(this.models.values()).filter((m) => m.available);
  }

  /**
   * Get all models (including unavailable) for UI display
   */
  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ModelProvider): ModelInfo[] {
    return Array.from(this.models.values()).filter((m) => m.provider === provider && m.available);
  }

  /**
   * Get models by tier
   */
  getModelsByTier(tier: ModelTier): ModelInfo[] {
    return Array.from(this.models.values()).filter((m) => m.tier === tier && m.available);
  }

  /**
   * Get models with a specific capability
   */
  getModelsWithCapability(capability: ModelCapability): ModelInfo[] {
    return Array.from(this.models.values()).filter(
      (m) => m.available && m.capabilities.includes(capability)
    );
  }

  /**
   * Get the default model for a tier
   */
  getDefaultModel(tier: ModelTier): ModelInfo | undefined {
    const modelId = this.config.defaultModels[tier];
    const model = this.models.get(modelId);
    if (model?.available) return model;

    // Fallback to any available model in that tier
    return this.getModelsByTier(tier)[0];
  }

  /**
   * Get fallback chain
   */
  getFallbackChain(): ModelInfo[] {
    return this.config.fallbackChain
      .map((id) => this.models.get(id))
      .filter((m): m is ModelInfo => m !== undefined && m.available);
  }

  /**
   * Update model metrics after an invocation
   */
  updateMetrics(
    modelId: string,
    result: { latencyMs: number; dqScore: number; success: boolean; capability?: ModelCapability }
  ): void {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    const n = metrics.totalInvocations;

    // Update running averages
    metrics.avgLatencyMs = (metrics.avgLatencyMs * n + result.latencyMs) / (n + 1);
    metrics.avgDqScore = (metrics.avgDqScore * n + result.dqScore) / (n + 1);
    metrics.successRate = (metrics.successRate * n + (result.success ? 1 : 0)) / (n + 1);
    metrics.totalInvocations = n + 1;
    metrics.lastUsed = Date.now();

    // Update capability-specific score
    if (result.capability) {
      const currentScore = metrics.capabilityScores.get(result.capability) ?? 0.5;
      const capN = metrics.totalInvocations; // Simplification - use total for now
      const newScore = (currentScore * (capN - 1) + result.dqScore) / capN;
      metrics.capabilityScores.set(result.capability, newScore);
    }
  }

  /**
   * Mark a model as unavailable (e.g., rate limited)
   */
  setAvailability(modelId: string, available: boolean, rateLimitResetsAt?: number): void {
    const model = this.models.get(modelId);
    if (model) {
      model.available = available;
      model.rateLimitResetsAt = rateLimitResetsAt;
    }
  }

  /**
   * Register a custom model
   */
  registerModel(model: ModelInfo): void {
    this.models.set(model.id, model);
    archonLog('info', `Registered custom model: ${model.id}`);
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(modelId);
    if (!model) return 0;

    return (
      (inputTokens / 1_000_000) * model.inputCostPer1M +
      (outputTokens / 1_000_000) * model.outputCostPer1M
    );
  }

  /**
   * Check if cost is within budget
   */
  isWithinBudget(modelId: string, estimatedInputTokens: number, estimatedOutputTokens: number): boolean {
    const cost = this.estimateCost(modelId, estimatedInputTokens, estimatedOutputTokens);
    return cost <= this.config.maxCostPerTask;
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalModels: number;
    availableModels: number;
    byProvider: Record<string, number>;
    byTier: Record<string, number>;
  } {
    const byProvider: Record<string, number> = {};
    const byTier: Record<string, number> = {};

    for (const model of Array.from(this.models.values())) {
      if (model.available) {
        byProvider[model.provider] = (byProvider[model.provider] ?? 0) + 1;
        byTier[model.tier] = (byTier[model.tier] ?? 0) + 1;
      }
    }

    return {
      totalModels: this.models.size,
      availableModels: this.getAvailableModels().length,
      byProvider,
      byTier,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let registryInstance: ModelRegistry | null = null;

export function getModelRegistry(config?: Partial<ModelRegistryConfig>): ModelRegistry {
  if (!registryInstance) {
    registryInstance = new ModelRegistry(config);
  }
  return registryInstance;
}
