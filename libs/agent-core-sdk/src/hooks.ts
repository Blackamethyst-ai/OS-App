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
  RelatedConceptsResult,
  SessionLineageResult,
  SessionsGraphResult,
  CognitiveState,
  SessionPrediction,
  ErrorPredictionResponse,
  OptimalTimeResponse,
  PredictionAccuracy,
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

// ============================================================
// Graph Intelligence Hooks
// ============================================================

/**
 * Find concepts related to a query
 * Returns nodes and edges for graph visualization
 */
export function useRelatedConcepts(options: {
  query: string;
  depth?: number;
  limit?: number;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [result, setResult] = useState<RelatedConceptsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { query, depth = 2, limit = 20, debounceMs = 300, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!query || query.length < 2) {
      setResult(null);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await defaultClient.fetch<RelatedConceptsResult>(
          `/api/graph/concepts?query=${encodeURIComponent(query)}&depth=${depth}&limit=${limit}`
        );
        if (mounted) {
          setResult(response);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, query, depth, limit, debounceMs]);

  return { result, isLoading, error };
}

/**
 * Get session lineage graph
 * Returns nodes and edges showing research lineage
 */
export function useSessionLineage(
  sessionId: string,
  options: {
    includeFindings?: boolean;
    includePapers?: boolean;
    client?: AgentCoreClient;
  } = {}
) {
  const [lineage, setLineage] = useState<SessionLineageResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { includeFindings = true, includePapers = true, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    setIsLoading(true);

    const fetchLineage = async () => {
      try {
        const params = new URLSearchParams({
          include_findings: String(includeFindings),
          include_papers: String(includePapers),
        });
        const response = await defaultClient.fetch<SessionLineageResult>(
          `/api/graph/lineage/${sessionId}?${params}`
        );
        if (mounted) {
          setLineage(response);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLineage();

    return () => {
      mounted = false;
    };
  }, [defaultClient, sessionId, includeFindings, includePapers]);

  return { lineage, isLoading, error };
}

/**
 * Get graph of all sessions with connections
 */
export function useSessionsGraph(options: {
  limit?: number;
  project?: string;
  client?: AgentCoreClient;
} = {}) {
  const [graph, setGraph] = useState<SessionsGraphResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { limit = 30, project, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const fetchGraph = async () => {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (project) params.set('project', project);

        const response = await defaultClient.fetch<SessionsGraphResult>(
          `/api/graph/sessions?${params}`
        );
        if (mounted) {
          setGraph(response);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchGraph();

    return () => {
      mounted = false;
    };
  }, [defaultClient, limit, project]);

  return { graph, isLoading, error };
}

// ============================================================
// Meta-Learning Prediction Hooks (Phase 6)
// ============================================================

/**
 * Predict session outcome based on intent and cognitive state
 * Returns quality prediction, success probability, and recommended actions
 */
export function useSessionPrediction(options: {
  intent: string;
  cognitiveState?: CognitiveState;
  track?: boolean;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [prediction, setPrediction] = useState<SessionPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { intent, cognitiveState, track = false, debounceMs = 500, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!intent || intent.length < 3) {
      setPrediction(null);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const result = await defaultClient.predictSession({
          intent,
          cognitive_state: cognitiveState,
          track_prediction: track,
        });
        if (mounted) {
          setPrediction(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, intent, cognitiveState, track, debounceMs]);

  return { prediction, isLoading, error };
}

/**
 * Predict potential errors for a given task
 * Returns preventable error patterns with solutions
 */
export function useErrorPrediction(options: {
  intent: string;
  preventableOnly?: boolean;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [errors, setErrors] = useState<ErrorPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { intent, preventableOnly = true, debounceMs = 500, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!intent || intent.length < 3) {
      setErrors(null);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const result = await defaultClient.predictErrors({
          intent,
          include_preventable_only: preventableOnly,
        });
        if (mounted) {
          setErrors(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, intent, preventableOnly, debounceMs]);

  return { errors, isLoading, error };
}

/**
 * Find optimal time for a task based on cognitive patterns
 */
export function useOptimalTime(options: {
  intent: string;
  currentHour?: number;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [optimalTime, setOptimalTime] = useState<OptimalTimeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { intent, currentHour, debounceMs = 500, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!intent || intent.length < 3) {
      setOptimalTime(null);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const result = await defaultClient.predictOptimalTime({
          intent,
          current_hour: currentHour,
        });
        if (mounted) {
          setOptimalTime(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, intent, currentHour, debounceMs]);

  return { optimalTime, isLoading, error };
}

/**
 * Get prediction accuracy metrics
 * Useful for calibration dashboards
 */
export function usePredictionAccuracy(options: {
  days?: number;
  client?: AgentCoreClient;
} = {}) {
  const [accuracy, setAccuracy] = useState<PredictionAccuracy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { days = 30, client } = options;
  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const fetchAccuracy = async () => {
      try {
        const result = await defaultClient.getPredictionAccuracy(days);
        if (mounted) {
          setAccuracy(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAccuracy();

    return () => {
      mounted = false;
    };
  }, [defaultClient, days]);

  return { accuracy, isLoading, error };
}

/**
 * Comprehensive prediction hook combining all prediction features
 * Returns session prediction, errors, and optimal timing in one call
 */
export function usePredictionWithContext(options: {
  intent: string;
  track?: boolean;
  includeErrors?: boolean;
  includeOptimalTime?: boolean;
  debounceMs?: number;
  client?: AgentCoreClient;
}) {
  const [data, setData] = useState<{
    prediction: SessionPrediction;
    errors?: ErrorPredictionResponse;
    optimalTime?: OptimalTimeResponse;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    intent,
    track = false,
    includeErrors = true,
    includeOptimalTime = true,
    debounceMs = 500,
    client,
  } = options;

  const defaultClient = useMemo(
    () => client || new AgentCoreClient(),
    [client]
  );

  useEffect(() => {
    if (!intent || intent.length < 3) {
      setData(null);
      return;
    }

    let mounted = true;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const result = await defaultClient.getPredictionWithContext(intent, {
          track,
          includeErrors,
          includeOptimalTime,
        });
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [defaultClient, intent, track, includeErrors, includeOptimalTime, debounceMs]);

  return { data, isLoading, error };
}
