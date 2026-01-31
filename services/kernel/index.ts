/**
 * AGENTIC KERNEL - Barrel Export
 *
 * The LLM-as-a-Kernel architecture for the Sovereign AI OS.
 */

// Core kernel
export { agentKernel, type DispatchOptions, type DispatchResult } from './AgentKernel';
export { KernelScheduler } from './KernelScheduler';
export { IntentResolver } from './IntentResolver';

// MCP Context Bridge (US-017)
export {
  MCPContextBridge,
  mcpContextBridge,
  initializeMCPBridge,
  fetchContext,
  injectLayerContext,
  loadOrganismContext,
} from './mcpContextBridge';

export type {
  MCPConfig,
  ContextUpdateCallback,
  InjectionPattern,
  ContextSelectionResult,
  ConnectionStatus,
} from './mcpContextBridge';

// Types
export type {
  // Kernel core
  KernelOperationalMode,
  KernelTask,
  ResolvedIntent,
  IntentCategory,
  TaskPriority,
  ExtractedEntity,

  // Semantic paging
  SemanticPage,
  PageState,
  PageFault,
  PageMetadata,
  PagingConfig,

  // Agentic file system
  AgenticFile,
  FileMetadata,
  FileSurfaceEvent,

  // Biometrics
  BiometricSource,
  GazePoint,
  GazeFixation,
  StressIndicators,
  StressLevel,
  BiometricContext,
  BiometricConfig,

  // Events
  KernelEvent,
  KernelEventType,
  KernelEventHandler,

  // Metrics
  KernelMetrics,
} from './types';
