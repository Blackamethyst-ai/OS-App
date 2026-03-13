/**
 * RelatedConcepts - Sidebar component for concept exploration
 *
 * Features:
 * - Search input for concept queries
 * - List of related concepts with relevance scores
 * - Click to explore connections
 * - Integration with useRelatedConcepts hook
 */

import { useState, useCallback } from 'react';
import { useRelatedConcepts } from '../../libs/agent-core-sdk/src/hooks';
import type { GraphNode } from '../../libs/agent-core-sdk/src/types';

// Type icons
const TYPE_ICONS: Record<string, string> = {
  session: '📁',
  finding: '💡',
  paper: '📄',
  thesis: '🎯',
  gap: '⚠️',
  innovation: '✨',
  concept: '🔮',
};

// Type colors for badges
const TYPE_COLORS: Record<string, string> = {
  session: 'bg-blue-100 text-blue-800',
  finding: 'bg-green-100 text-green-800',
  paper: 'bg-purple-100 text-purple-800',
  thesis: 'bg-amber-100 text-amber-800',
  gap: 'bg-red-100 text-red-800',
  innovation: 'bg-pink-100 text-pink-800',
  concept: 'bg-gray-100 text-gray-800',
};

interface RelatedConceptsProps {
  initialQuery?: string;
  onConceptClick?: (concept: GraphNode) => void;
  onSessionClick?: (sessionId: string) => void;
  className?: string;
  showGraph?: boolean;
  onShowGraph?: (concepts: GraphNode[]) => void;
}

export function RelatedConcepts({
  initialQuery = '',
  onConceptClick,
  onSessionClick,
  className = '',
  showGraph = true,
  onShowGraph,
}: RelatedConceptsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  const { result, isLoading, error } = useRelatedConcepts({
    query,
    depth: 2,
    limit: 20,
    debounceMs: 400,
  });

  const handleConceptClick = useCallback(
    (concept: GraphNode) => {
      setSelectedConcept(concept.id);
      onConceptClick?.(concept);

      // If it's a session, also trigger session click
      if (concept.type === 'session') {
        onSessionClick?.(concept.id);
      }
    },
    [onConceptClick, onSessionClick]
  );

  const handleShowGraph = useCallback(() => {
    if (result?.concepts) {
      onShowGraph?.(result.concepts);
    }
  }, [result, onShowGraph]);

  const concepts = result?.concepts || [];
  const edges = result?.edges || [];

  // Group concepts by type
  const groupedConcepts = concepts.reduce<Record<string, GraphNode[]>>(
    (acc, concept) => {
      const type = concept.type || 'concept';
      if (!acc[type]) acc[type] = [];
      acc[type].push(concept);
      return acc;
    },
    {}
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts..."
            className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Stats */}
        {result && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>
              {concepts.length} concepts, {edges.length} connections
            </span>
            {showGraph && concepts.length > 0 && (
              <button
                onClick={handleShowGraph}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View Graph →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--azure-blue)] border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">
          Failed to load concepts: {error.message}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && query && concepts.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No related concepts found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}

      {/* Initial State */}
      {!query && (
        <div className="p-8 text-center text-gray-500">
          <p>Enter a concept to explore</p>
          <p className="text-xs mt-1">
            Search for topics, keywords, or research areas
          </p>
        </div>
      )}

      {/* Concept List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedConcepts).map(([type, typeConcepts]) => (
          <div key={type} className="border-b border-gray-100 dark:border-gray-800">
            {/* Type Header */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {TYPE_ICONS[type] || '📌'} {type}s ({typeConcepts.length})
            </div>

            {/* Concepts in this type */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {typeConcepts.map((concept) => (
                <li
                  key={concept.id}
                  className={`
                    px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer
                    transition-colors duration-150
                    ${selectedConcept === concept.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                  onClick={() => handleConceptClick(concept)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {concept.label}
                      </p>
                      {concept.session_id && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          from: {concept.session_id.slice(0, 30)}...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      {/* Relevance Score */}
                      {concept.relevance !== undefined && (
                        <span
                          className={`
                            text-xs px-1.5 py-0.5 rounded
                            ${
                              concept.relevance >= 0.7
                                ? 'bg-green-100 text-green-700'
                                : concept.relevance >= 0.4
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }
                          `}
                        >
                          {(concept.relevance * 100).toFixed(0)}%
                        </span>
                      )}

                      {/* Type Badge */}
                      <span
                        className={`
                          text-xs px-1.5 py-0.5 rounded
                          ${TYPE_COLORS[concept.type] || 'bg-gray-100 text-gray-600'}
                        `}
                      >
                        {concept.type}
                      </span>
                    </div>
                  </div>

                  {/* URL for papers */}
                  {concept.url && (
                    <a
                      href={concept.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {concept.url.slice(0, 50)}...
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RelatedConcepts;
