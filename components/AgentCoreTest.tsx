/**
 * Agent Core SDK Test Component
 * Tests the integration with the Chief of Staff API
 */

import { useState } from 'react';
import {
  useAgentCoreHealth,
  useSemanticSearch,
  useSessions,
  useLogInsight,
  AgentCoreClient,
} from '@antigravity/agent-core-sdk';

export function AgentCoreTest() {
  const [searchQuery, setSearchQuery] = useState('');
  const [logContent, setLogContent] = useState('');

  // Health check
  const { isHealthy, isLoading: healthLoading } = useAgentCoreHealth();

  // Sessions list
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions({ limit: 5 });

  // Semantic search
  const { results, isLoading: searchLoading } = useSemanticSearch({
    query: searchQuery,
    limit: 5,
    debounceMs: 500,
  });

  // Log insight mutation
  const { logInsight, isLoading: logLoading } = useLogInsight();

  const handleLogInsight = async () => {
    if (!logContent.trim()) return;
    try {
      const result = await logInsight(logContent, 'finding', ['test', 'sdk']);
      alert(`Logged insight! ID: ${result.id}, Category: ${result.category}`);
      setLogContent('');
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Agent Core SDK Test</h1>

      {/* Health Status */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">API Health</h2>
        {healthLoading ? (
          <span className="text-yellow-400">Checking...</span>
        ) : isHealthy ? (
          <span className="text-green-400">✅ Agent Core API Healthy</span>
        ) : (
          <span className="text-red-400">❌ API Unavailable - Run: api-start</span>
        )}
      </div>

      {/* Sessions List */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Recent Sessions</h2>
        {sessionsLoading ? (
          <span className="text-yellow-400">Loading...</span>
        ) : sessionsError ? (
          <span className="text-red-400">Error: {sessionsError.message}</span>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="text-gray-300 text-sm">
                <span className="text-purple-400">{session.topic || session.id}</span>
                <span className="text-gray-500 ml-2">
                  ({session.finding_count} findings, {session.url_count} URLs)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Semantic Search */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Semantic Search</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="w-full bg-gray-700 text-white px-4 py-2 rounded mb-4"
        />
        {searchLoading ? (
          <span className="text-yellow-400">Searching...</span>
        ) : results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((result, i) => (
              <li key={i} className="text-gray-300 text-sm border-l-2 border-purple-500 pl-3">
                <div className="text-white">{result.content.slice(0, 150)}...</div>
                <div className="text-gray-500 text-xs mt-1">
                  Category: {result.category} | Similarity: {(result.similarity * 100).toFixed(0)}%
                </div>
              </li>
            ))}
          </ul>
        ) : searchQuery.length > 1 ? (
          <span className="text-gray-500">No results found</span>
        ) : (
          <span className="text-gray-500">Type to search...</span>
        )}
      </div>

      {/* Log Insight */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Log Insight</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={logContent}
            onChange={(e) => setLogContent(e.target.value)}
            placeholder="Enter insight to log..."
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded"
          />
          <button
            onClick={handleLogInsight}
            disabled={logLoading || !logContent.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {logLoading ? 'Logging...' : 'Log'}
          </button>
        </div>
      </div>

      {/* Direct Client Test */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Direct Client Test</h2>
        <button
          onClick={async () => {
            const client = new AgentCoreClient({ project: 'os-app' });
            try {
              const health = await client.health();
              alert(`API Version: ${health.version}\nStatus: ${health.status}`);
            } catch (err) {
              alert(`Error: ${err}`);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Test Direct Client
        </button>
      </div>
    </div>
  );
}

export default AgentCoreTest;
