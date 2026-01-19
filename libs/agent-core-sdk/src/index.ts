/**
 * Agent Core SDK
 * TypeScript SDK for Antigravity Chief of Staff API
 *
 * @example
 * ```typescript
 * import { AgentCoreClient, useAgentContext } from '@antigravity/agent-core-sdk';
 *
 * // Direct client usage
 * const client = new AgentCoreClient({ project: 'os-app' });
 * const results = await client.search('multi-agent orchestration');
 *
 * // React hook usage
 * function MyComponent() {
 *   const { context, isLoading } = useAgentContext('routing patterns');
 *   return <div>{context?.searchResults.map(r => r.content)}</div>;
 * }
 * ```
 */

// Client
export { AgentCoreClient, agentCore } from './client';

// React Hooks
export {
  useAgentCoreClient,
  useAgentCoreHealth,
  useSessions,
  useSession,
  useSemanticSearch,
  useAgentContext,
  useReinvigoration,
  useLogInsight,
} from './hooks';

// Types
export type {
  // Client options
  AgentCoreClientOptions,

  // Session types
  SessionSummary,
  SessionDetail,

  // Finding types
  Finding,
  FindingType,
  EvidenceSource,

  // URL types
  CapturedUrl,

  // Search types
  SearchQuery,
  SearchResult,

  // Pack types
  ContextPack,
  PackSelection,
  SelectedPacks,

  // Reinvigoration types
  ReinvigorationContext,
  Lineage,

  // API types
  ApiHealth,
  CreateFindingRequest,
  CreateFindingResponse,
} from './types';
