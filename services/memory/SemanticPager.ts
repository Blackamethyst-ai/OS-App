/**
 * SEMANTIC PAGER - MemOS-Style Context Management
 *
 * Implements semantic paging for LLM context windows, treating
 * all system data as "Semantic Context" rather than static data.
 *
 * Key concepts:
 * - Pages: Units of semantic content with embeddings
 * - Page States: COLD (disk), WARM (cached), HOT (active), PINNED (always loaded)
 * - Page Faults: When requested context isn't in memory
 * - Eviction: LRU/LFU/Relevance-based page removal
 *
 * Reference: MemOS (github.com/MemTensor/MemOS)
 */

import {
  SemanticPage,
  PageState,
  PageFault,
  PageMetadata,
  PagingConfig,
  ResolvedIntent,
} from '../kernel/types';

const DEFAULT_CONFIG: PagingConfig = {
  maxContextTokens: 128000, // Gemini 2.0 context window
  hotPageThreshold: 5,
  evictionPolicy: 'RELEVANCE',
  prefetchEnabled: true,
  prefetchDepth: 2,
};

export class SemanticPager {
  private config: PagingConfig;
  private pages: Map<string, SemanticPage> = new Map();
  private pageIndex: Map<string, string[]> = new Map(); // tag -> pageIds
  private pageFaults: PageFault[] = [];
  private totalTokens: number = 0;

  constructor(config: Partial<PagingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the pager
   */
  async initialize(): Promise<void> {
    // Load pinned pages from storage
    await this.loadPinnedPages();
    if (import.meta.env.DEV) console.log('📄 SEMANTIC_PAGER: Initialized');
  }

  /**
   * Flush all pages to storage
   */
  async flush(): Promise<void> {
    // Persist HOT and WARM pages
    const toFlush = Array.from(this.pages.values()).filter(
      p => p.state === 'HOT' || p.state === 'WARM' || p.state === 'PINNED'
    );

    // Would persist to IndexedDB via neuralVault
    if (import.meta.env.DEV) console.log(`📄 SEMANTIC_PAGER: Flushed ${toFlush.length} pages`);
  }

  // ============================================================================
  // PAGE OPERATIONS
  // ============================================================================

  /**
   * Load pages relevant to an intent
   */
  async pageForIntent(intent: ResolvedIntent): Promise<SemanticPage[]> {
    const relevantPages: SemanticPage[] = [];

    // 1. Get pinned pages (always included)
    const pinned = this.getPinnedPages();
    relevantPages.push(...pinned);

    // 2. Get pages matching context hints
    for (const hint of intent.contextHints) {
      const tagPages = await this.getPagesByTag(hint);
      relevantPages.push(...tagPages);
    }

    // 3. Get pages matching entities
    for (const entity of intent.entities) {
      const entityPages = await this.getPagesByTag(`entity:${entity.value}`);
      relevantPages.push(...entityPages);
    }

    // 4. If under budget, prefetch related pages
    const currentTokens = relevantPages.reduce((sum, p) => sum + p.size, 0);
    if (this.config.prefetchEnabled && currentTokens < this.config.maxContextTokens * 0.7) {
      const prefetched = await this.prefetchRelated(relevantPages);
      relevantPages.push(...prefetched);
    }

    // 5. Deduplicate and sort by relevance
    const unique = this.deduplicatePages(relevantPages);
    unique.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 6. Trim to fit context window
    const fitted = this.fitToContextWindow(unique);

    // 7. Update page states
    fitted.forEach(page => this.touchPage(page.id));

    return fitted;
  }

  /**
   * Load a specific page by ID
   */
  async loadPage(pageId: string): Promise<SemanticPage | null> {
    // Check in-memory first
    if (this.pages.has(pageId)) {
      const page = this.pages.get(pageId)!;
      this.touchPage(pageId);
      return page;
    }

    // Try to load from storage
    const loaded = await this.loadFromStorage(pageId);
    if (loaded) {
      this.addPage(loaded);
      return loaded;
    }

    // Record page fault
    this.recordPageFault(pageId, 'NOT_FOUND');
    return null;
  }

  /**
   * Store a new page
   */
  async storePage(
    content: string,
    type: SemanticPage['type'],
    metadata: Partial<PageMetadata> = {}
  ): Promise<SemanticPage> {
    const page: SemanticPage = {
      id: crypto.randomUUID(),
      type,
      content,
      relevanceScore: 1.0,
      lastAccessed: Date.now(),
      accessCount: 1,
      state: 'WARM',
      size: this.estimateTokens(content),
      metadata: {
        source: metadata.source || 'user',
        tags: metadata.tags || [],
        createdAt: Date.now(),
        priority: metadata.priority || 50,
        dependencies: metadata.dependencies || [],
        ...metadata,
      },
    };

    // Generate embedding if possible
    page.embedding = await this.generateEmbedding(content);

    this.addPage(page);
    return page;
  }

  /**
   * Remove a page
   */
  removePage(pageId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    this.totalTokens -= page.size;
    this.pages.delete(pageId);

    // Remove from index
    for (const tag of page.metadata.tags) {
      const tagPages = this.pageIndex.get(tag);
      if (tagPages) {
        const idx = tagPages.indexOf(pageId);
        if (idx >= 0) tagPages.splice(idx, 1);
      }
    }

    return true;
  }

  /**
   * Pin a page (always loaded)
   */
  pinPage(pageId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page) return false;

    page.state = 'PINNED';
    return true;
  }

  /**
   * Unpin a page
   */
  unpinPage(pageId: string): boolean {
    const page = this.pages.get(pageId);
    if (!page || page.state !== 'PINNED') return false;

    page.state = 'HOT';
    return true;
  }

  // ============================================================================
  // PREFETCH & PREDICTION
  // ============================================================================

  /**
   * Prefetch context for a UI element (gaze-triggered)
   */
  async prefetchForElement(elementId: string): Promise<void> {
    if (!this.config.prefetchEnabled) return;

    // Look up element -> page mapping
    const relatedPages = await this.getPagesByTag(`element:${elementId}`);

    for (const page of relatedPages) {
      if (page.state === 'COLD') {
        page.state = 'WARM';
        this.touchPage(page.id);
      }
    }

    if (import.meta.env.DEV) console.log(`📄 SEMANTIC_PAGER: Prefetched ${relatedPages.length} pages for element ${elementId}`);
  }

  /**
   * Prefetch related pages based on current context
   */
  private async prefetchRelated(currentPages: SemanticPage[]): Promise<SemanticPage[]> {
    const prefetched: SemanticPage[] = [];
    const seen = new Set(currentPages.map(p => p.id));

    for (const page of currentPages) {
      for (const depId of page.metadata.dependencies) {
        if (seen.has(depId)) continue;

        const dep = await this.loadPage(depId);
        if (dep) {
          prefetched.push(dep);
          seen.add(depId);
        }
      }

      // Stop if we've prefetched enough
      if (prefetched.length >= this.config.prefetchDepth * 3) break;
    }

    return prefetched;
  }

  // ============================================================================
  // EVICTION
  // ============================================================================

  /**
   * Evict pages to free up space
   */
  private evictToFit(targetTokens: number): void {
    const evictable = Array.from(this.pages.values())
      .filter(p => p.state !== 'PINNED')
      .sort((a, b) => this.evictionScore(a) - this.evictionScore(b));

    let freed = 0;
    for (const page of evictable) {
      if (this.totalTokens - freed <= targetTokens) break;

      this.removePage(page.id);
      freed += page.size;
    }

    if (import.meta.env.DEV) console.log(`📄 SEMANTIC_PAGER: Evicted ${freed} tokens`);
  }

  /**
   * Calculate eviction priority (lower = evict first)
   */
  private evictionScore(page: SemanticPage): number {
    switch (this.config.evictionPolicy) {
      case 'LRU':
        return page.lastAccessed;
      case 'LFU':
        return page.accessCount;
      case 'RELEVANCE':
      default: {
        // Combine recency, frequency, and relevance
        const recencyScore = (Date.now() - page.lastAccessed) / (1000 * 60 * 60); // Hours old
        const frequencyScore = page.accessCount;
        const relevanceScore = page.relevanceScore * 100;
        return relevanceScore + frequencyScore - recencyScore;
      }
    }
  }

  // ============================================================================
  // QUERY & RETRIEVAL
  // ============================================================================

  /**
   * Get pages by tag
   */
  private async getPagesByTag(tag: string): Promise<SemanticPage[]> {
    const pageIds = this.pageIndex.get(tag) || [];
    const pages: SemanticPage[] = [];

    for (const id of pageIds) {
      const page = await this.loadPage(id);
      if (page) pages.push(page);
    }

    return pages;
  }

  /**
   * Get all pinned pages
   */
  private getPinnedPages(): SemanticPage[] {
    return Array.from(this.pages.values()).filter(p => p.state === 'PINNED');
  }

  /**
   * Semantic search across pages
   */
  async semanticSearch(query: string, limit: number = 5): Promise<SemanticPage[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) return [];

    const scored = Array.from(this.pages.values())
      .filter(p => p.embedding)
      .map(p => ({
        page: p,
        score: this.cosineSimilarity(queryEmbedding, p.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(s => s.page);
  }

  // ============================================================================
  // METRICS & STATE
  // ============================================================================

  /**
   * Get pager statistics
   */
  getStats(): PagerStats {
    const pages = Array.from(this.pages.values());
    return {
      totalPages: pages.length,
      totalTokens: this.totalTokens,
      maxTokens: this.config.maxContextTokens,
      utilization: this.totalTokens / this.config.maxContextTokens,
      pagesByState: {
        COLD: pages.filter(p => p.state === 'COLD').length,
        WARM: pages.filter(p => p.state === 'WARM').length,
        HOT: pages.filter(p => p.state === 'HOT').length,
        PINNED: pages.filter(p => p.state === 'PINNED').length,
      },
      pageFaults: this.pageFaults.length,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Get recent page faults
   */
  getPageFaults(limit: number = 10): PageFault[] {
    return this.pageFaults.slice(-limit);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private addPage(page: SemanticPage): void {
    // Evict if needed
    if (this.totalTokens + page.size > this.config.maxContextTokens) {
      this.evictToFit(this.config.maxContextTokens - page.size);
    }

    this.pages.set(page.id, page);
    this.totalTokens += page.size;

    // Index by tags
    for (const tag of page.metadata.tags) {
      if (!this.pageIndex.has(tag)) {
        this.pageIndex.set(tag, []);
      }
      this.pageIndex.get(tag)!.push(page.id);
    }
  }

  private touchPage(pageId: string): void {
    const page = this.pages.get(pageId);
    if (!page) return;

    page.lastAccessed = Date.now();
    page.accessCount++;

    // Promote to HOT if frequently accessed
    if (page.state === 'WARM' && page.accessCount >= this.config.hotPageThreshold) {
      page.state = 'HOT';
    }
  }

  private recordPageFault(pageId: string, reason: PageFault['reason']): void {
    this.pageFaults.push({
      id: crypto.randomUUID(),
      requestedPageId: pageId,
      reason,
      timestamp: Date.now(),
      resolved: false,
    });
  }

  private deduplicatePages(pages: SemanticPage[]): SemanticPage[] {
    const seen = new Set<string>();
    return pages.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  private fitToContextWindow(pages: SemanticPage[]): SemanticPage[] {
    const result: SemanticPage[] = [];
    let totalSize = 0;

    for (const page of pages) {
      if (totalSize + page.size <= this.config.maxContextTokens) {
        result.push(page);
        totalSize += page.size;
      }
    }

    return result;
  }

  private estimateTokens(content: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4);
  }

  private async generateEmbedding(content: string): Promise<number[] | undefined> {
    // Would call geminiService.generateEmbedding
    // For now, return undefined (embedding generation is async/optional)
    return undefined;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async loadPinnedPages(): Promise<void> {
    // Would load from IndexedDB via neuralVault
    // Create some default system pages
    await this.storePage(
      'System instruction: You are a Sovereign AI Operating System.',
      'CONTEXT',
      { tags: ['system', 'instruction'], priority: 100 }
    );
  }

  private async loadFromStorage(pageId: string): Promise<SemanticPage | null> {
    // Would load from IndexedDB via neuralVault
    return null;
  }

  private calculateCacheHitRate(): number {
    // Simple calculation based on recent page faults
    const recentFaults = this.pageFaults.filter(
      f => Date.now() - f.timestamp < 1000 * 60 * 5 // Last 5 minutes
    );
    const totalAccesses = this.pages.size + recentFaults.length;
    if (totalAccesses === 0) return 1;
    return (totalAccesses - recentFaults.length) / totalAccesses;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface PagerStats {
  totalPages: number;
  totalTokens: number;
  maxTokens: number;
  utilization: number;
  pagesByState: Record<PageState, number>;
  pageFaults: number;
  cacheHitRate: number;
}
