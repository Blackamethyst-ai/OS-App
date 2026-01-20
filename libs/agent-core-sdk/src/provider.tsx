/**
 * Agent Core Context Provider
 * Provides SDK client and methods to all components in the app
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { AgentCoreClient } from './client';
import type { AgentCoreClientOptions, SearchResult, Finding, SelectedPacks } from './types';

// ============================================================
// Context Types
// ============================================================

interface AgentCoreContextValue {
  client: AgentCoreClient;
  project: string;

  // Convenience methods
  search: (query: string, limit?: number) => Promise<SearchResult[]>;
  logInsight: (content: string, type?: string, tags?: string[]) => Promise<void>;
  getContext: (query: string) => Promise<{
    searchResults: SearchResult[];
    findings?: Finding[];
    packs?: SelectedPacks;
  }>;
}

// ============================================================
// Context
// ============================================================

const AgentCoreContext = createContext<AgentCoreContextValue | null>(null);

// ============================================================
// Provider Props
// ============================================================

interface AgentCoreProviderProps {
  children: ReactNode;
  project?: string;
  baseUrl?: string;
  options?: Partial<AgentCoreClientOptions>;
}

// ============================================================
// Provider Component
// ============================================================

/**
 * AgentCoreProvider
 *
 * Wraps your app to provide Agent Core SDK access throughout.
 *
 * @example
 * ```tsx
 * // In your app root
 * import { AgentCoreProvider } from '@antigravity/agent-core-sdk';
 *
 * function App() {
 *   return (
 *     <AgentCoreProvider project="os-app">
 *       <YourApp />
 *     </AgentCoreProvider>
 *   );
 * }
 * ```
 */
export function AgentCoreProvider({
  children,
  project = 'os-app',
  baseUrl,
  options = {},
}: AgentCoreProviderProps) {
  // Create client with merged options
  const client = useMemo(
    () =>
      new AgentCoreClient({
        project,
        baseUrl,
        ...options,
      }),
    [project, baseUrl, options]
  );

  // Convenience methods bound to this client
  const search = useMemo(
    () => async (query: string, limit: number = 5) => {
      return client.search(query, { limit });
    },
    [client]
  );

  const logInsight = useMemo(
    () => async (content: string, type: string = 'finding', tags: string[] = []) => {
      await client.logInsight(content, type, tags);
    },
    [client]
  );

  const getContext = useMemo(
    () => async (query: string) => {
      return client.getRelevantContext(query, {
        limit: 5,
        includeFindings: true,
        includePacks: true,
      });
    },
    [client]
  );

  const value = useMemo<AgentCoreContextValue>(
    () => ({
      client,
      project,
      search,
      logInsight,
      getContext,
    }),
    [client, project, search, logInsight, getContext]
  );

  return (
    <AgentCoreContext.Provider value={value}>
      {children}
    </AgentCoreContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

/**
 * useAgentCore
 *
 * Access the Agent Core SDK from any component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { search, logInsight, getContext } = useAgentCore();
 *
 *   const handleSearch = async () => {
 *     const results = await search('multi-agent patterns');
 *     console.log(results);
 *   };
 *
 *   return <button onClick={handleSearch}>Search</button>;
 * }
 * ```
 */
export function useAgentCore(): AgentCoreContextValue {
  const context = useContext(AgentCoreContext);

  if (!context) {
    throw new Error(
      'useAgentCore must be used within an AgentCoreProvider. ' +
      'Wrap your app with <AgentCoreProvider project="your-project">.'
    );
  }

  return context;
}

// ============================================================
// Optional: Safe hook that returns null if no provider
// ============================================================

/**
 * useAgentCoreSafe
 *
 * Like useAgentCore, but returns null instead of throwing
 * if used outside a provider. Useful for optional integrations.
 */
export function useAgentCoreSafe(): AgentCoreContextValue | null {
  return useContext(AgentCoreContext);
}
