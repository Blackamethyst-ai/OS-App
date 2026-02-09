/**
 * MCP Context Bridge (US-017)
 *
 * Connects organism layers to ResearchGravity MCP server for context injection.
 * Enables semantic context packs to flow into genome, swarm, and cognitive layers.
 *
 * Features:
 * - Context pack selection via ResearchGravity's 7-layer V2 system
 * - Layer-specific context injection patterns
 * - Real-time context update subscriptions
 * - Biometric-aware context prioritization
 *
 * Integration:
 * - ResearchGravity MCP Server (localhost:3847)
 * - Uses select_context_packs tool with V2 semantic selection
 *
 * Research basis:
 * - Context Packs V2 (7-layer semantic selection)
 * - ResearchGravity research session tracking
 */

import type {
  ContextPack,
  SubsystemType,
  BiometricContext,
} from '../archon/types';
import { organismRegistry } from '../organisms';
import { logger } from '../logger';

// =============================================================================
// TYPES
// =============================================================================

/** MCP server configuration */
export interface MCPConfig {
  /** Server base URL (default: http://localhost:3847) */
  serverUrl: string;
  /** Default token budget for context selection */
  defaultBudget: number;
  /** Use V2 7-layer selection (default: true) */
  useV2: boolean;
  /** Connection timeout in ms */
  timeout: number;
  /** Retry attempts on failure */
  retryAttempts: number;
  /** Retry delay base in ms (exponential backoff) */
  retryDelayMs: number;
}

/** Context update callback */
export type ContextUpdateCallback = (packs: ContextPack[]) => void;

/** Layer-specific injection pattern */
export interface InjectionPattern {
  /** Target layer */
  layer: SubsystemType;
  /** Query to select relevant context */
  queryTemplate: string;
  /** Token budget for this layer */
  budgetRatio: number;
  /** Priority (higher = processed first) */
  priority: number;
}

/** Context selection result */
export interface ContextSelectionResult {
  packs: ContextPack[];
  metadata: {
    query: string;
    budget: number;
    tokensUsed: number;
    selectionTimeMs: number;
    version: 'v1' | 'v2';
    layerDistribution: Record<SubsystemType, number>;
  };
}

/** Connection status */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: MCPConfig = {
  serverUrl: import.meta.env.VITE_AGENT_CORE_URL || 'http://localhost:3847',
  defaultBudget: 50000,
  useV2: true,
  timeout: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/** Default injection patterns for organism layers */
const DEFAULT_INJECTION_PATTERNS: InjectionPattern[] = [
  {
    layer: 'genome',
    queryTemplate: 'skill examples implementations patterns code {intent}',
    budgetRatio: 0.25, // 25% of budget
    priority: 2,
  },
  {
    layer: 'swarm',
    queryTemplate: 'coordination patterns multi-agent orchestration consensus {intent}',
    budgetRatio: 0.40, // 40% of budget (largest for team coordination)
    priority: 1,
  },
  {
    layer: 'cognitive',
    queryTemplate: 'memory consolidation strategies forgetting prevention episodic {intent}',
    budgetRatio: 0.35, // 35% of budget
    priority: 3,
  },
];

// =============================================================================
// MCP CONTEXT BRIDGE
// =============================================================================

/**
 * MCPContextBridge connects organism layers to ResearchGravity MCP server.
 *
 * Usage:
 * ```typescript
 * const bridge = new MCPContextBridge();
 * await bridge.initialize();
 *
 * // Fetch and inject context for all layers
 * const packs = await bridge.fetchContextPacks('implement user authentication');
 * bridge.injectContext('genome', packs.filter(p => p.source === 'research'));
 *
 * // Subscribe to updates
 * bridge.subscribeToUpdates((packs) => {
 *   console.log('New context:', packs.length, 'packs');
 * });
 * ```
 */
export class MCPContextBridge {
  private config: MCPConfig;
  private status: ConnectionStatus = 'disconnected';
  private subscribers: Set<ContextUpdateCallback> = new Set();
  private injectionPatterns: InjectionPattern[];
  private lastBiometricContext?: BiometricContext;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private cache: Map<string, { packs: ContextPack[]; timestamp: number }> = new Map();
  private cacheMaxAgeMs = 60000; // 1 minute cache

  constructor(config: Partial<MCPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.injectionPatterns = [...DEFAULT_INJECTION_PATTERNS];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the MCP Context Bridge.
   * Connects to ResearchGravity MCP server and verifies availability.
   */
  async initialize(): Promise<void> {
    if (this.status === 'connected') {
      logger.warn('Already initialized', undefined, 'MCPContextBridge');
      return;
    }

    this.status = 'connecting';
    logger.info('Initializing connection', { serverUrl: this.config.serverUrl }, 'MCPContextBridge');

    try {
      // Verify server is available
      const healthResponse = await this.fetchWithRetry('/', 'GET');

      if (healthResponse.ok) {
        this.status = 'connected';
        logger.info('Connected to ResearchGravity MCP server', undefined, 'MCPContextBridge');
      } else {
        throw new Error(`Server returned ${healthResponse.status}`);
      }
    } catch (error) {
      this.status = 'error';
      logger.error('Failed to connect', error, 'MCPContextBridge');
      // Don't throw - allow offline operation with cached/empty context
    }
  }

  /**
   * Shutdown the bridge and clean up resources.
   */
  async shutdown(): Promise<void> {
    logger.debug('Shutting down', undefined, 'MCPContextBridge');

    // Stop polling if active
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Clear subscribers
    this.subscribers.clear();

    // Clear cache
    this.cache.clear();

    this.status = 'disconnected';
    logger.debug('Shutdown complete', undefined, 'MCPContextBridge');
  }

  // ---------------------------------------------------------------------------
  // Context Fetching
  // ---------------------------------------------------------------------------

  /**
   * Fetch context packs from ResearchGravity MCP server.
   *
   * @param query - Natural language query for context selection
   * @param budget - Token budget (defaults to config.defaultBudget)
   * @returns Selected context packs with metadata
   */
  async fetchContextPacks(
    query: string,
    budget: number = this.config.defaultBudget
  ): Promise<ContextPack[]> {
    // Check cache first
    const cacheKey = `${query}:${budget}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAgeMs) {
      logger.debug('Returning cached context packs', undefined, 'MCPContextBridge');
      return cached.packs;
    }

    if (this.status !== 'connected') {
      logger.warn('Not connected, returning empty packs', undefined, 'MCPContextBridge');
      return [];
    }

    try {
      const startTime = Date.now();

      // Call ResearchGravity select_context_packs API
      const response = await this.fetchWithRetry(
        '/api/context/select',
        'POST',
        {
          query,
          budget,
          use_v2: this.config.useV2,
          include_metadata: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch context packs: ${response.status}`);
      }

      const data = await response.json();

      // Transform API response to ContextPack format
      const packs = this.transformApiResponse(data);

      // Cache the result
      this.cache.set(cacheKey, { packs, timestamp: Date.now() });

      logger.debug(`Fetched ${packs.length} context packs in ${Date.now() - startTime}ms`, undefined, 'MCPContextBridge');

      // Notify subscribers
      this.notifySubscribers(packs);

      return packs;
    } catch (error) {
      logger.error('Failed to fetch context packs', error, 'MCPContextBridge');

      // Return cached data if available, even if stale
      if (cached) {
        logger.debug('Returning stale cached data', undefined, 'MCPContextBridge');
        return cached.packs;
      }

      return [];
    }
  }

  /**
   * Fetch context packs for a specific organism layer.
   *
   * @param layerId - Target organism layer
   * @param intent - User intent for context selection
   * @returns Layer-specific context packs
   */
  async fetchContextForLayer(
    layerId: SubsystemType,
    intent: string
  ): Promise<ContextPack[]> {
    const pattern = this.injectionPatterns.find((p) => p.layer === layerId);
    if (!pattern) {
      logger.warn(`No injection pattern for layer: ${layerId}`, undefined, 'MCPContextBridge');
      return [];
    }

    // Build query from template
    const query = pattern.queryTemplate.replace('{intent}', intent);
    const budget = Math.floor(this.config.defaultBudget * pattern.budgetRatio);

    return this.fetchContextPacks(query, budget);
  }

  /**
   * Fetch and distribute context across all organism layers.
   *
   * @param intent - User intent for context selection
   * @returns Aggregated context selection result
   */
  async fetchAndDistributeContext(intent: string): Promise<ContextSelectionResult> {
    const startTime = Date.now();
    const allPacks: ContextPack[] = [];
    const layerDistribution: Record<SubsystemType, number> = {} as Record<SubsystemType, number>;

    // Sort patterns by priority
    const sortedPatterns = [...this.injectionPatterns].sort(
      (a, b) => a.priority - b.priority
    );

    // Fetch context for each layer
    for (const pattern of sortedPatterns) {
      const packs = await this.fetchContextForLayer(pattern.layer, intent);

      // Inject into layer
      this.injectContext(pattern.layer, packs);

      allPacks.push(...packs);
      layerDistribution[pattern.layer] = packs.reduce(
        (sum, p) => sum + p.tokenCount,
        0
      );
    }

    const totalTokens = allPacks.reduce((sum, p) => sum + p.tokenCount, 0);

    return {
      packs: allPacks,
      metadata: {
        query: intent,
        budget: this.config.defaultBudget,
        tokensUsed: totalTokens,
        selectionTimeMs: Date.now() - startTime,
        version: this.config.useV2 ? 'v2' : 'v1',
        layerDistribution,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Context Injection
  // ---------------------------------------------------------------------------

  /**
   * Inject context packs into a specific organism layer.
   *
   * @param layerId - Target organism layer
   * @param packs - Context packs to inject
   */
  injectContext(layerId: SubsystemType, packs: ContextPack[]): void {
    const layer = organismRegistry.get(layerId);

    if (!layer) {
      logger.warn(`Layer not found in registry: ${layerId}`, undefined, 'MCPContextBridge');
      return;
    }

    // Apply biometric-aware filtering if available
    const filteredPacks = this.filterByBiometricState(packs);

    // Inject via organism layer's MCP context hook
    layer.onMCPContext(filteredPacks);

    logger.debug(`Injected ${filteredPacks.length} packs into ${layerId} layer`, undefined, 'MCPContextBridge');
  }

  /**
   * Inject context into all organism layers based on relevance.
   *
   * @param packs - Context packs to distribute
   */
  injectContextToAll(packs: ContextPack[]): void {
    // Group packs by best-fit layer
    const layerPacks = this.groupPacksByLayer(packs);

    for (const [layerId, layerPackList] of Object.entries(layerPacks)) {
      this.injectContext(layerId as SubsystemType, layerPackList);
    }
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to context updates.
   *
   * @param callback - Function to call when new context is available
   * @returns Unsubscribe function
   */
  subscribeToUpdates(callback: ContextUpdateCallback): () => void {
    this.subscribers.add(callback);

    // Start polling if not already
    if (!this.pollingInterval && this.status === 'connected') {
      this.startPolling();
    }

    return () => {
      this.subscribers.delete(callback);

      // Stop polling if no subscribers
      if (this.subscribers.size === 0 && this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = undefined;
      }
    };
  }

  /**
   * Start polling for context updates.
   */
  private startPolling(): void {
    // Poll every 30 seconds
    this.pollingInterval = setInterval(async () => {
      if (this.status !== 'connected') return;

      try {
        // Check for session updates
        const response = await this.fetchWithRetry(
          '/api/sessions/active',
          'GET'
        );

        if (response.ok) {
          const session = await response.json();
          if (session && session.findings_captured) {
            // Refresh context if session has new findings
            const packs = await this.fetchContextPacks('recent findings and updates');
            this.notifySubscribers(packs);
          }
        }
      } catch (error) {
        logger.warn('Polling error', error, 'MCPContextBridge');
      }
    }, 30000);
  }

  /**
   * Notify all subscribers of context updates.
   */
  private notifySubscribers(packs: ContextPack[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(packs);
      } catch (error) {
        logger.error('Subscriber callback error', error, 'MCPContextBridge');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Biometric Integration
  // ---------------------------------------------------------------------------

  /**
   * Update biometric context for adaptive filtering.
   *
   * @param context - Current biometric context
   */
  updateBiometricContext(context: BiometricContext): void {
    this.lastBiometricContext = context;
  }

  /**
   * Filter packs based on current biometric state.
   * High stress = prioritize simpler, more actionable content.
   */
  private filterByBiometricState(packs: ContextPack[]): ContextPack[] {
    if (!this.lastBiometricContext) {
      return packs;
    }

    const { stressLevel, focusScore } = this.lastBiometricContext;

    // High stress: filter to highest relevance only
    if (stressLevel > 0.7) {
      logger.debug('High stress detected, filtering to top packs', undefined, 'MCPContextBridge');
      return packs
        .filter((p) => p.relevanceScore > 0.8)
        .slice(0, Math.min(3, packs.length));
    }

    // Low focus: reduce volume
    if (focusScore < 0.3) {
      logger.debug('Low focus detected, reducing pack volume', undefined, 'MCPContextBridge');
      return packs.slice(0, Math.min(5, packs.length));
    }

    return packs;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetch with retry logic and exponential backoff.
   */
  private async fetchWithRetry(
    path: string,
    method: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${this.config.serverUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on timeout
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          logger.debug(`Retry ${attempt + 1} after ${delay}ms`, undefined, 'MCPContextBridge');
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }

  /**
   * Transform API response to ContextPack format.
   */
  private transformApiResponse(data: unknown): ContextPack[] {
    // Handle different API response formats
    if (Array.isArray(data)) {
      return data.map(this.normalizeContextPack);
    }

    // Handle wrapped response
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.packs)) {
        return obj.packs.map(this.normalizeContextPack);
      }
      if (Array.isArray(obj.context_packs)) {
        return obj.context_packs.map(this.normalizeContextPack);
      }
      if (Array.isArray(obj.results)) {
        return obj.results.map(this.normalizeContextPack);
      }
    }

    logger.warn('Unexpected API response format', undefined, 'MCPContextBridge');
    return [];
  }

  /**
   * Normalize a raw pack object to ContextPack interface.
   */
  private normalizeContextPack = (raw: unknown): ContextPack => {
    const obj = raw as Record<string, unknown>;

    return {
      id: String(obj.id || obj.pack_id || `pack-${Date.now()}`),
      name: String(obj.name || obj.title || 'Untitled'),
      content: String(obj.content || obj.text || ''),
      relevanceScore: Number(obj.relevance_score || obj.relevance || obj.score || 0.5),
      tokenCount: Number(obj.token_count || obj.tokens || this.estimateTokens(String(obj.content || ''))),
      source: this.normalizeSource(obj.source || obj.type),
    };
  };

  /**
   * Normalize source type to valid ContextPack source.
   */
  private normalizeSource(source: unknown): 'research' | 'session' | 'project' {
    const s = String(source).toLowerCase();
    if (s.includes('research') || s.includes('paper') || s.includes('arxiv')) {
      return 'research';
    }
    if (s.includes('session') || s.includes('finding')) {
      return 'session';
    }
    return 'project';
  }

  /**
   * Estimate token count from content length.
   */
  private estimateTokens(content: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Group packs by best-fit organism layer.
   */
  private groupPacksByLayer(packs: ContextPack[]): Record<string, ContextPack[]> {
    const groups: Record<string, ContextPack[]> = {
      genome: [],
      swarm: [],
      cognitive: [],
    };

    for (const pack of packs) {
      const content = pack.content.toLowerCase();
      const name = pack.name.toLowerCase();

      // Heuristic classification based on content
      if (
        content.includes('skill') ||
        content.includes('implementation') ||
        content.includes('code') ||
        content.includes('function') ||
        name.includes('skill')
      ) {
        groups.genome.push(pack);
      } else if (
        content.includes('coordination') ||
        content.includes('consensus') ||
        content.includes('agent') ||
        content.includes('swarm') ||
        content.includes('team') ||
        name.includes('coordination')
      ) {
        groups.swarm.push(pack);
      } else if (
        content.includes('memory') ||
        content.includes('consolidation') ||
        content.includes('episode') ||
        content.includes('forgetting') ||
        name.includes('memory')
      ) {
        groups.cognitive.push(pack);
      } else {
        // Default to swarm (general coordination)
        groups.swarm.push(pack);
      }
    }

    return groups;
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /**
   * Get current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current configuration.
   */
  getConfig(): MCPConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(updates: Partial<MCPConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Add or update an injection pattern.
   */
  setInjectionPattern(pattern: InjectionPattern): void {
    const index = this.injectionPatterns.findIndex((p) => p.layer === pattern.layer);
    if (index >= 0) {
      this.injectionPatterns[index] = pattern;
    } else {
      this.injectionPatterns.push(pattern);
    }
  }

  /**
   * Get injection patterns.
   */
  getInjectionPatterns(): InjectionPattern[] {
    return [...this.injectionPatterns];
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Singleton MCP Context Bridge instance */
export const mcpContextBridge = new MCPContextBridge();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Initialize the MCP Context Bridge singleton.
 */
export async function initializeMCPBridge(
  config?: Partial<MCPConfig>
): Promise<MCPContextBridge> {
  if (config) {
    mcpContextBridge.updateConfig(config);
  }
  await mcpContextBridge.initialize();
  return mcpContextBridge;
}

/**
 * Fetch context packs for a query.
 */
export async function fetchContext(
  query: string,
  budget?: number
): Promise<ContextPack[]> {
  return mcpContextBridge.fetchContextPacks(query, budget);
}

/**
 * Inject context into a specific layer.
 */
export function injectLayerContext(
  layerId: SubsystemType,
  packs: ContextPack[]
): void {
  mcpContextBridge.injectContext(layerId, packs);
}

/**
 * Fetch and inject context for all organism layers.
 */
export async function loadOrganismContext(
  intent: string
): Promise<ContextSelectionResult> {
  return mcpContextBridge.fetchAndDistributeContext(intent);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default mcpContextBridge;
