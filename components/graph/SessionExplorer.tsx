/**
 * SessionExplorer - Full session exploration interface
 *
 * Combines:
 * - Session list with filtering
 * - Session lineage graph
 * - Related concepts sidebar
 * - Sessions graph view (all sessions connected)
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useSessions,
  useSessionLineage,
  useSessionsGraph,
} from '../../libs/agent-core-sdk/src/hooks';
import type { GraphNode, SessionSummary } from '../../libs/agent-core-sdk/src/types';
import { LineageGraph } from './LineageGraph';
import { RelatedConcepts } from './RelatedConcepts';

type ViewMode = 'list' | 'lineage' | 'network';

interface SessionExplorerProps {
  project?: string;
  initialSessionId?: string;
  className?: string;
}

export function SessionExplorer({
  project,
  initialSessionId,
  className = '',
}: SessionExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  // Data hooks
  const { sessions, isLoading: sessionsLoading } = useSessions({
    limit: 50,
    project,
  });

  const { lineage, isLoading: lineageLoading } = useSessionLineage(
    selectedSessionId || '',
    { includeFindings: true, includePapers: true }
  );

  const { graph: sessionsGraph, isLoading: graphLoading } = useSessionsGraph({
    limit: 30,
    project,
  });

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.topic?.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        s.project?.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  // Handle session selection
  const handleSessionClick = useCallback((session: SessionSummary) => {
    setSelectedSessionId(session.id);
    setViewMode('lineage');
  }, []);

  // Handle node click in graph
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'session') {
      setSelectedSessionId(node.id);
    } else if (node.session_id) {
      setSelectedSessionId(node.session_id);
    }
  }, []);

  // Handle concept click from sidebar
  const handleConceptClick = useCallback((concept: GraphNode) => {
    if (concept.type === 'session') {
      setSelectedSessionId(concept.id);
      setViewMode('lineage');
    }
  }, []);

  // Get current view title
  const getViewTitle = () => {
    switch (viewMode) {
      case 'list':
        return 'Research Sessions';
      case 'lineage':
        return selectedSessionId
          ? `Session: ${selectedSessionId.slice(0, 40)}...`
          : 'Session Lineage';
      case 'network':
        return 'Session Network';
      default:
        return 'Explorer';
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getViewTitle()}
            </h2>

            {/* View Mode Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['list', 'lineage', 'network'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-3 py-1 text-sm rounded-md transition-colors
                    ${
                      viewMode === mode
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search (for list view) */}
            {viewMode === 'list' && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter sessions..."
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            )}

            {/* Toggle Sidebar */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={showSidebar ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'}
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {/* List View */}
          {viewMode === 'list' && (
            <div className="p-4">
              {sessionsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--azure-blue)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${
                          selectedSessionId === session.id
                            ? 'border-[var(--azure-blue)] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }
                      `}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.topic || session.id.slice(0, 30)}
                      </h3>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>{session.finding_count} findings</span>
                        <span>{session.url_count} URLs</span>
                        {session.project && (
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                            {session.project}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400 truncate">
                        {session.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lineage View */}
          {viewMode === 'lineage' && (
            <div className="h-full flex flex-col">
              {!selectedSessionId ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Select a session to view its lineage</p>
                </div>
              ) : lineageLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--azure-blue)] border-t-transparent rounded-full" />
                </div>
              ) : lineage ? (
                <>
                  {/* Session Info Bar */}
                  {selectedSession && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedSession.topic}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {lineage.node_count} nodes, {lineage.edge_count} connections
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSessionId(null);
                            setViewMode('list');
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          ← Back to list
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Graph */}
                  <div className="flex-1 p-4">
                    <LineageGraph
                      nodes={lineage.nodes}
                      edges={lineage.edges}
                      width={800}
                      height={500}
                      onNodeClick={handleNodeClick}
                      className="mx-auto"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>No lineage data available</p>
                </div>
              )}
            </div>
          )}

          {/* Network View */}
          {viewMode === 'network' && (
            <div className="h-full p-4">
              {graphLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-[var(--azure-blue)] border-t-transparent rounded-full" />
                </div>
              ) : sessionsGraph ? (
                <div className="h-full flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {sessionsGraph.nodes.length} sessions, {sessionsGraph.edges.length} connections
                      {sessionsGraph.shared_papers > 0 && (
                        <span className="ml-2">
                          ({sessionsGraph.shared_papers} shared paper references)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-1">
                    <LineageGraph
                      nodes={sessionsGraph.nodes}
                      edges={sessionsGraph.edges}
                      width={1000}
                      height={600}
                      onNodeClick={handleNodeClick}
                      className="mx-auto"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No session network data available</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <RelatedConcepts
            initialQuery={selectedSession?.topic || ''}
            onConceptClick={handleConceptClick}
            onSessionClick={(id) => {
              setSelectedSessionId(id);
              setViewMode('lineage');
            }}
            showGraph={false}
            className="flex-1"
          />
        </aside>
      )}
    </div>
  );
}

export default SessionExplorer;
