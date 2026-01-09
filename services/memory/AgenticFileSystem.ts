/**
 * AGENTIC FILE SYSTEM (AFS)
 *
 * A filesystem that proactively surfaces files to the LLM context
 * based on user intent, eliminating manual "Open File" actions.
 *
 * Key features:
 * - Intent-based file surfacing
 * - Gaze-triggered prefetching
 * - Semantic file indexing
 * - Dependency graph tracking
 *
 * Reference: arXiv:2512.05470 (Agentic File System)
 */

import {
  AgenticFile,
  FileMetadata,
  FileSurfaceEvent,
  ResolvedIntent,
  GazeFixation,
} from '../kernel/types';

interface AFSConfig {
  maxSurfacedFiles: number;
  relevanceThreshold: number;
  autoSurfaceEnabled: boolean;
  indexUpdateIntervalMs: number;
}

const DEFAULT_CONFIG: AFSConfig = {
  maxSurfacedFiles: 10,
  relevanceThreshold: 0.5,
  autoSurfaceEnabled: true,
  indexUpdateIntervalMs: 30000,
};

export class AgenticFileSystem {
  private config: AFSConfig;
  private files: Map<string, AgenticFile> = new Map();
  private fileIndex: Map<string, Set<string>> = new Map(); // keyword -> fileIds
  private surfaceEvents: FileSurfaceEvent[] = [];
  private accessLog: { fileId: string; timestamp: number }[] = [];

  // Element to file mapping for gaze-triggered surfacing
  private elementFileMap: Map<string, string[]> = new Map();

  constructor(config: Partial<AFSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the AFS
   */
  async initialize(): Promise<void> {
    // Start background index update
    if (this.config.autoSurfaceEnabled) {
      setInterval(() => this.updateIndex(), this.config.indexUpdateIntervalMs);
    }
    console.log('📁 AFS: Initialized');
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  /**
   * Register a file with the AFS
   */
  async registerFile(
    path: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ): Promise<AgenticFile> {
    const file: AgenticFile = {
      id: crypto.randomUUID(),
      path,
      name: path.split('/').pop() || path,
      type: 'FILE',
      content,
      lastModified: Date.now(),
      relevanceToIntent: 0,
      autoSurfaced: false,
      metadata: {
        size: content.length,
        tags: metadata.tags || [],
        relatedFiles: metadata.relatedFiles || [],
        ...metadata,
      },
    };

    // Generate semantic summary
    file.metadata.semanticSummary = await this.generateSummary(content);

    // Index the file
    this.files.set(file.id, file);
    this.indexFile(file);

    return file;
  }

  /**
   * Register a directory
   */
  registerDirectory(path: string): AgenticFile {
    const dir: AgenticFile = {
      id: crypto.randomUUID(),
      path,
      name: path.split('/').pop() || path,
      type: 'DIRECTORY',
      lastModified: Date.now(),
      relevanceToIntent: 0,
      autoSurfaced: false,
      metadata: {
        size: 0,
        tags: ['directory'],
        relatedFiles: [],
      },
    };

    this.files.set(dir.id, dir);
    return dir;
  }

  /**
   * Get a file by ID
   */
  getFile(fileId: string): AgenticFile | undefined {
    const file = this.files.get(fileId);
    if (file) {
      this.logAccess(fileId);
    }
    return file;
  }

  /**
   * Get a file by path
   */
  getFileByPath(path: string): AgenticFile | undefined {
    for (const file of this.files.values()) {
      if (file.path === path) {
        this.logAccess(file.id);
        return file;
      }
    }
    return undefined;
  }

  /**
   * Update file content
   */
  updateFile(fileId: string, content: string): boolean {
    const file = this.files.get(fileId);
    if (!file) return false;

    file.content = content;
    file.lastModified = Date.now();
    file.metadata.size = content.length;

    // Re-index
    this.indexFile(file);

    return true;
  }

  /**
   * Remove a file
   */
  removeFile(fileId: string): boolean {
    const file = this.files.get(fileId);
    if (!file) return false;

    this.files.delete(fileId);
    this.removeFromIndex(file);

    return true;
  }

  // ============================================================================
  // INTENT-BASED SURFACING
  // ============================================================================

  /**
   * Surface files relevant to an intent
   */
  async surfaceForIntent(intent: ResolvedIntent): Promise<AgenticFile[]> {
    if (!this.config.autoSurfaceEnabled) return [];

    const scored: { file: AgenticFile; score: number }[] = [];

    for (const file of this.files.values()) {
      const score = this.calculateRelevance(file, intent);
      if (score >= this.config.relevanceThreshold) {
        file.relevanceToIntent = score;
        scored.push({ file, score });
      }
    }

    // Sort by relevance and take top N
    scored.sort((a, b) => b.score - a.score);
    const surfaced = scored.slice(0, this.config.maxSurfacedFiles).map(s => s.file);

    // Record surface events
    for (const file of surfaced) {
      file.autoSurfaced = true;
      this.recordSurfaceEvent(file.id, 'INTENT_MATCH', file.relevanceToIntent);
    }

    return surfaced;
  }

  /**
   * Surface files based on gaze fixation
   */
  async surfaceForGaze(fixation: GazeFixation): Promise<AgenticFile[]> {
    if (!fixation.targetElement) return [];

    const fileIds = this.elementFileMap.get(fixation.targetElement) || [];
    const files = fileIds.map(id => this.files.get(id)).filter((f): f is AgenticFile => !!f);

    // Record surface events
    for (const file of files) {
      file.autoSurfaced = true;
      const confidence = Math.min(1, fixation.duration / 3000); // Max confidence at 3s
      this.recordSurfaceEvent(file.id, 'GAZE_FIXATION', confidence);
    }

    return files;
  }

  /**
   * Surface recently accessed files
   */
  surfaceRecent(limit: number = 5): AgenticFile[] {
    const recentIds = this.accessLog
      .slice(-limit * 2)
      .reverse()
      .map(log => log.fileId);

    const seen = new Set<string>();
    const files: AgenticFile[] = [];

    for (const id of recentIds) {
      if (seen.has(id)) continue;
      seen.add(id);

      const file = this.files.get(id);
      if (file) {
        file.autoSurfaced = true;
        this.recordSurfaceEvent(file.id, 'RECENT_ACCESS', 0.8);
        files.push(file);
      }

      if (files.length >= limit) break;
    }

    return files;
  }

  /**
   * Surface file dependencies
   */
  surfaceDependencies(fileId: string): AgenticFile[] {
    const file = this.files.get(fileId);
    if (!file) return [];

    const deps: AgenticFile[] = [];
    for (const depPath of file.metadata.relatedFiles) {
      const dep = this.getFileByPath(depPath);
      if (dep) {
        dep.autoSurfaced = true;
        this.recordSurfaceEvent(dep.id, 'DEPENDENCY', 0.9);
        deps.push(dep);
      }
    }

    return deps;
  }

  // ============================================================================
  // ELEMENT MAPPING
  // ============================================================================

  /**
   * Map a UI element to files (for gaze-triggered surfacing)
   */
  mapElementToFiles(elementId: string, fileIds: string[]): void {
    this.elementFileMap.set(elementId, fileIds);
  }

  /**
   * Remove element mapping
   */
  unmapElement(elementId: string): void {
    this.elementFileMap.delete(elementId);
  }

  // ============================================================================
  // SEARCH
  // ============================================================================

  /**
   * Search files by keyword
   */
  searchByKeyword(keyword: string): AgenticFile[] {
    const normalizedKeyword = keyword.toLowerCase();
    const fileIds = this.fileIndex.get(normalizedKeyword);
    if (!fileIds) return [];

    return Array.from(fileIds)
      .map(id => this.files.get(id))
      .filter((f): f is AgenticFile => !!f);
  }

  /**
   * Search files by tag
   */
  searchByTag(tag: string): AgenticFile[] {
    return Array.from(this.files.values()).filter(f => f.metadata.tags.includes(tag));
  }

  /**
   * Semantic search across files
   */
  async semanticSearch(query: string, limit: number = 5): Promise<AgenticFile[]> {
    // Would use embeddings for semantic similarity
    // For now, use keyword matching
    const keywords = query.toLowerCase().split(/\s+/);
    const scored = new Map<string, number>();

    for (const keyword of keywords) {
      const files = this.searchByKeyword(keyword);
      for (const file of files) {
        scored.set(file.id, (scored.get(file.id) || 0) + 1);
      }
    }

    return Array.from(scored.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.files.get(id))
      .filter((f): f is AgenticFile => !!f);
  }

  // ============================================================================
  // METRICS & STATE
  // ============================================================================

  /**
   * Get AFS statistics
   */
  getStats(): AFSStats {
    const files = Array.from(this.files.values());
    const surfacedFiles = files.filter(f => f.autoSurfaced);

    return {
      totalFiles: files.length,
      totalDirectories: files.filter(f => f.type === 'DIRECTORY').length,
      autoSurfacedCount: surfacedFiles.length,
      recentAccessCount: this.accessLog.length,
      surfaceEvents: this.surfaceEvents.length,
      acceptanceRate: this.calculateAcceptanceRate(),
    };
  }

  /**
   * Get recent surface events
   */
  getSurfaceEvents(limit: number = 20): FileSurfaceEvent[] {
    return this.surfaceEvents.slice(-limit);
  }

  /**
   * Mark a surface event as accepted/rejected
   */
  markSurfaceEventAccepted(eventId: string, accepted: boolean): void {
    const event = this.surfaceEvents.find(e => e.id === eventId);
    if (event) {
      event.accepted = accepted;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private indexFile(file: AgenticFile): void {
    // Extract keywords from content and path
    const keywords = this.extractKeywords(file);

    for (const keyword of keywords) {
      if (!this.fileIndex.has(keyword)) {
        this.fileIndex.set(keyword, new Set());
      }
      this.fileIndex.get(keyword)!.add(file.id);
    }
  }

  private removeFromIndex(file: AgenticFile): void {
    for (const [keyword, fileIds] of this.fileIndex.entries()) {
      fileIds.delete(file.id);
      if (fileIds.size === 0) {
        this.fileIndex.delete(keyword);
      }
    }
  }

  private extractKeywords(file: AgenticFile): string[] {
    const keywords: string[] = [];

    // From path
    const pathParts = file.path.toLowerCase().split(/[\/\\\._-]/);
    keywords.push(...pathParts.filter(p => p.length > 2));

    // From content
    if (file.content) {
      const contentWords = file.content
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3)
        .slice(0, 100); // Limit keywords per file
      keywords.push(...contentWords);
    }

    // From tags
    keywords.push(...file.metadata.tags);

    return [...new Set(keywords)];
  }

  private calculateRelevance(file: AgenticFile, intent: ResolvedIntent): number {
    let score = 0;

    // Check context hints
    for (const hint of intent.contextHints) {
      if (hint.startsWith('term:')) {
        const term = hint.slice(5);
        if (file.path.toLowerCase().includes(term)) score += 0.3;
        if (file.content?.toLowerCase().includes(term)) score += 0.2;
        if (file.metadata.tags.includes(term)) score += 0.4;
      }
    }

    // Check entities
    for (const entity of intent.entities) {
      if (entity.type === 'FILE' && file.path.includes(entity.value)) {
        score += 0.8;
      }
      if (entity.type === 'CONCEPT' && file.metadata.tags.includes(entity.value)) {
        score += 0.5;
      }
    }

    // Recency boost
    const hoursSinceAccess = (Date.now() - file.lastModified) / (1000 * 60 * 60);
    if (hoursSinceAccess < 1) score += 0.2;
    else if (hoursSinceAccess < 24) score += 0.1;

    return Math.min(1, score);
  }

  private async generateSummary(content: string): Promise<string> {
    // Would call LLM for summarization
    // For now, return first 200 chars
    return content.slice(0, 200) + (content.length > 200 ? '...' : '');
  }

  private logAccess(fileId: string): void {
    this.accessLog.push({ fileId, timestamp: Date.now() });

    // Keep only recent accesses
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }

  private recordSurfaceEvent(
    fileId: string,
    reason: FileSurfaceEvent['reason'],
    confidence: number
  ): void {
    this.surfaceEvents.push({
      id: crypto.randomUUID(),
      fileId,
      reason,
      confidence,
      timestamp: Date.now(),
      accepted: false, // Will be updated if user interacts
    });

    // Keep only recent events
    if (this.surfaceEvents.length > 500) {
      this.surfaceEvents = this.surfaceEvents.slice(-250);
    }
  }

  private calculateAcceptanceRate(): number {
    const recentEvents = this.surfaceEvents.filter(
      e => Date.now() - e.timestamp < 1000 * 60 * 60 // Last hour
    );
    if (recentEvents.length === 0) return 0;

    const accepted = recentEvents.filter(e => e.accepted).length;
    return accepted / recentEvents.length;
  }

  private async updateIndex(): Promise<void> {
    // Periodically refresh file summaries and embeddings
    // This would be more sophisticated in production
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface AFSStats {
  totalFiles: number;
  totalDirectories: number;
  autoSurfacedCount: number;
  recentAccessCount: number;
  surfaceEvents: number;
  acceptanceRate: number;
}
