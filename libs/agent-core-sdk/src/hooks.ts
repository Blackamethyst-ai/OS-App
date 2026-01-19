/**
 * React Hooks for Agent Core SDK
 * Provides easy integration with React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AgentCoreClient } from './client';
import type {
  AgentCoreClientOptions,
  SessionSummary,
  SessionDetail,
  Finding,
  SearchResult,
  SelectedPacks,
  ReinvigorationContext,
} from './types';

// ============================================================
// Client Hook
// ============================================================

/**
 * Create a configured Agent Core client
 */
export function useAgentCoreClient(options: AgentCoreClientOptions = {}) {
  return useMemo(() => new AgentCoreClient(options), [
    options.baseUrl,
    options.project,
    options.timeout,
  ]);
}

// ============================================================
// Health Hook
// ============================================================

/**
 * Check API health status
 */
export function useAgentCoreHealth(client?: AgentCoreClient) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const defaultClient = useMemo(() => client || new AgentCoreClient(), [client]);

  useEffect(() => {
    let mounted = true;

    defaultClient.isHealthy().then((healthy) => {
      if (mounted) {
        setIsHealthy(healthy);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [defaultClient]);

  return { isHealthy, isLoading };
}

// ============================================================
// Sessions Hooks
// ============================================================

/**
 * Fetch list of sessions
 */
export function useSessions(options: {
  limit?: number;
  project?: string;
  client?: AgentCoreClient;
} = {}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const defaultClient = useMemo(
    () => options.client || new AgentCoreClient(),
    [options.client]
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    defaultClient
      .listSessions({ limit: options.limit, project: options.project })
      .then((data) => {
        if (mounted) {
          setSessions(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [defaultClient, options.limit, options.project]);

  return { sessions, isLoading, error };
}

/**
 * Fetch single session detail
 */
export function useSession(sessionId: string, client?: AgentCoreClient) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    setIsLoading(true);

    defaultClient
      .getSession(sessionId)
      .then((data) => {
        if (mounted) {
          setSession(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [defaultClient, sessionId]);

  return { session, isLoading, error };
}

// ============================================================
// Search Hooks
// ============================================================

/**
 * Semantic search hook with debouncing
 */
export function useSemanticSearch(options: {
  query: string;
  category?: 'all' | 'facts' | 'decisions' | 'patterns';
  limit?: number;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { query, category, limit, debounceMs = 300, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(() => {
      setIsLoading(true);

      defaultClient
        .semanticSearch({ query, category, limit })
        .then((data) => {
          if (mounted) {
            setResults(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err);
          }
        })
        .finally(() => {
          if (mounted) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, query, category, limit, debounceMs]);

  return { results, isLoading, error };
}

// ============================================================
// Context Hooks
// ============================================================

/**
 * Get relevant context for a query
 * Useful for Agentic Kernel decision points
 */
export function useAgentContext(query: string, options: {
  limit?: number;
  includeFindings?: boolean;
  includePacks?: boolean;
  client?: AgentCoreClient;
} = {}) {
  const [context, setContext] = useState<{
    searchResults: SearchResult[];
    findings?: Finding[];
    packs?: SelectedPacks;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const defaultClient = useMemo(
    () => options.client || new AgentCoreClient(),
    [options.client]
  );

  const fetchContext = useCallback(async () => {
    if (!query) return;

    setIsLoading(true);
    try {
      const data = await defaultClient.getRelevantContext(query, {
        limit: options.limit,
        includeFindings: options.includeFindings,
        includePacks: options.includePacks,
      });
      setContext(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [defaultClient, query, options.limit, options.includeFindings, options.includePacks]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, isLoading, error, refetch: fetchContext };
}

// ============================================================
// Reinvigoration Hook
// ============================================================

/**
 * Get reinvigoration context for a session
 */
export function useReinvigoration(sessionId: string, client?: AgentCoreClient) {
  const [context, setContext] = useState<ReinvigorationContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    setIsLoading(true);

    defaultClient
      .getReinvigorationContext(sessionId)
      .then((data) => {
        if (mounted) {
          setContext(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [defaultClient, sessionId]);

  return { context, isLoading, error };
}

// ============================================================
// Mutation Hook
// ============================================================

/**
 * Log insights from the application
 */
export function useLogInsight(client?: AgentCoreClient) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  const logInsight = useCallback(
    async (content: string, type: string = 'finding', tags: string[] = []) => {
      setIsLoading(true);
      try {
        const result = await defaultClient.logInsight(content, type, tags);
        setError(null);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [defaultClient]
  );

  return { logInsight, isLoading, error };
}
