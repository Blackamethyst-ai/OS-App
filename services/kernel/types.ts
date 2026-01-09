/**
 * AGENTIC KERNEL TYPES
 *
 * Type definitions for the LLM-as-a-Kernel architecture.
 * Based on: Agentic OS research (arXiv:2512.05470) and MemOS patterns.
 */

import { AppMode } from '../../types';

// ============================================================================
// KERNEL CORE TYPES
// ============================================================================

export type KernelState = 'BOOTING' | 'IDLE' | 'PROCESSING' | 'PAGING' | 'SUSPENDED' | 'ERROR';

export type IntentCategory =
  | 'NAVIGATION'      // Mode/view switching
  | 'QUERY'           // Information retrieval
  | 'MUTATION'        // State changes
  | 'CREATION'        // Asset/artifact generation
  | 'ANALYSIS'        // Deep reasoning
  | 'ORCHESTRATION'   // Multi-agent coordination
  | 'BIOMETRIC'       // Gaze/stress response
  | 'UI_REGENERATION'; // Self-synthesizing adaptive UI

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';

export interface KernelTask {
  id: string;
  intent: ResolvedIntent;
  priority: TaskPriority;
  status: 'QUEUED' | 'RUNNING' | 'BLOCKED' | 'COMPLETED' | 'FAILED';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
  contextPages: string[]; // IDs of semantic pages loaded for this task
}

export interface ResolvedIntent {
  id: string;
  category: IntentCategory;
  rawInput: string;
  confidence: number;
  targetMode?: AppMode;
  entities: ExtractedEntity[];
  contextHints: string[];
  suggestedTools: string[];
  biometricContext?: BiometricContext;
}

export interface ExtractedEntity {
  type: 'FILE' | 'AGENT' | 'MODE' | 'ARTIFACT' | 'CONCEPT' | 'ACTION';
  value: string;
  confidence: number;
  span: [number, number]; // Character positions in raw input
}

// ============================================================================
// SEMANTIC PAGING TYPES (MemOS-style)
// ============================================================================

export type PageState = 'COLD' | 'WARM' | 'HOT' | 'PINNED';

export interface SemanticPage {
  id: string;
  type: 'CONTEXT' | 'ARTIFACT' | 'AGENT_STATE' | 'TOOL_SCHEMA' | 'MEMORY' | 'FILE';
  content: string;
  embedding?: number[];
  relevanceScore: number;
  lastAccessed: number;
  accessCount: number;
  state: PageState;
  size: number; // Token count estimate
  metadata: PageMetadata;
}

export interface PageMetadata {
  source: string;
  tags: string[];
  createdAt: number;
  expiresAt?: number;
  priority: number;
  dependencies: string[]; // IDs of related pages
}

export interface PageFault {
  id: string;
  requestedPageId: string;
  reason: 'NOT_FOUND' | 'EXPIRED' | 'EVICTED' | 'TOO_LARGE';
  timestamp: number;
  resolved: boolean;
  resolutionAction?: 'RELOAD' | 'GENERATE' | 'SKIP';
}

export interface PagingConfig {
  maxContextTokens: number;
  hotPageThreshold: number; // Access count to become HOT
  evictionPolicy: 'LRU' | 'LFU' | 'RELEVANCE';
  prefetchEnabled: boolean;
  prefetchDepth: number;
}

// ============================================================================
// AGENTIC FILE SYSTEM TYPES
// ============================================================================

export interface AgenticFile {
  id: string;
  path: string;
  name: string;
  type: 'FILE' | 'DIRECTORY' | 'SYMLINK' | 'VIRTUAL';
  content?: string;
  embedding?: number[];
  lastModified: number;
  relevanceToIntent: number;
  autoSurfaced: boolean; // True if proactively surfaced by AFS
  metadata: FileMetadata;
}

export interface FileMetadata {
  size: number;
  mimeType?: string;
  tags: string[];
  semanticSummary?: string;
  relatedFiles: string[];
}

export interface FileSurfaceEvent {
  id: string;
  fileId: string;
  reason: 'INTENT_MATCH' | 'GAZE_FIXATION' | 'RECENT_ACCESS' | 'DEPENDENCY' | 'PREDICTION';
  confidence: number;
  timestamp: number;
  accepted: boolean;
}

// ============================================================================
// BIOMETRIC TYPES
// ============================================================================

export type BiometricSource = 'WEBCAM' | 'EXTERNAL_SENSOR' | 'MOCK';

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
  confidence: number;
  pupilDilation?: number;
}

export interface GazeFixation {
  id: string;
  centroid: { x: number; y: number };
  duration: number;
  startTime: number;
  endTime: number;
  targetElement?: string; // DOM element ID or selector
  targetWindow?: string;  // Window/app identifier
}

export interface StressIndicators {
  blinkRate: number;        // Blinks per minute
  pupilDilation: number;    // 0-1 normalized
  gazeStability: number;    // 0-1, lower = more erratic
  heartRateEstimate?: number; // BPM if available
}

export interface StressLevel {
  value: number;            // 0-100
  trend: 'RISING' | 'STABLE' | 'FALLING';
  confidence: number;
  timestamp: number;
}

export interface BiometricContext {
  currentGaze?: GazePoint;
  recentFixations: GazeFixation[];
  stressLevel: StressLevel;
  focusedElement?: string;
  attentionScore: number;   // 0-100
  cognitiveLoad: number;    // 0-100 estimate
}

export interface BiometricConfig {
  enabled: boolean;
  source: BiometricSource;
  gazeTrackingEnabled: boolean;
  stressDetectionEnabled: boolean;
  adaptiveUIEnabled: boolean;
  fixationThresholdMs: number;
  stressThreshold: number;    // 0-100, trigger UI simplification
  samplingRateHz: number;
}

// ============================================================================
// KERNEL EVENTS
// ============================================================================

export type KernelEventType =
  | 'BOOT_COMPLETE'
  | 'TASK_QUEUED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'PAGE_LOADED'
  | 'PAGE_EVICTED'
  | 'PAGE_FAULT'
  | 'FILE_SURFACED'
  | 'INTENT_RESOLVED'
  | 'GAZE_FIXATION'
  | 'STRESS_THRESHOLD'
  | 'UI_MUTATION'
  | 'UI_REGENERATION_START'
  | 'UI_REGENERATION_COMPLETE'
  | 'UI_EVALUATION'
  | 'UI_ITERATION';

export interface KernelEvent {
  id: string;
  type: KernelEventType;
  timestamp: number;
  payload: any;
  source: string;
}

export type KernelEventHandler = (event: KernelEvent) => void;

// ============================================================================
// KERNEL METRICS
// ============================================================================

export interface KernelMetrics {
  uptime: number;
  tasksProcessed: number;
  taskQueueDepth: number;
  pagesInMemory: number;
  totalPageSize: number;    // Total tokens in context
  pageFaults: number;
  cacheHitRate: number;
  avgTaskLatency: number;
  biometricSamples: number;
  lastGazeFixation?: number;
  currentStressLevel: number;
}
