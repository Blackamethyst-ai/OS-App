/**
 * ResearchChips - Display recommended research findings
 * Shows recommended research as clickable chips with relevance scores
 */

import React, { useState } from 'react';
import type { SearchResult } from '@antigravity/agent-core-sdk';
import './styles/predictions.css';

export interface ResearchChipsProps {
  research: SearchResult[];
  onSelect?: (result: SearchResult) => void;
  maxDisplay?: number;
  showScores?: boolean;
  compact?: boolean;
  className?: string;
}

export const ResearchChips: React.FC<ResearchChipsProps> = ({
  research,
  onSelect,
  maxDisplay = 5,
  showScores = true,
  compact = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!research || research.length === 0) {
    return null;
  }

  const displayResearch = expanded ? research : research.slice(0, maxDisplay);
  const hasMore = research.length > maxDisplay;
  const remainingCount = research.length - maxDisplay;

  const handleChipClick = (result: SearchResult) => {
    onSelect?.(result);
  };

  const getScoreClass = (similarity: number) => {
    if (similarity >= 0.8) return 'score-high';
    if (similarity >= 0.6) return 'score-medium';
    return 'score-low';
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (compact) {
    return (
      <div className={`research-chips compact ${className}`}>
        <span className="chips-icon">📚</span>
        <span className="chips-count">
          {research.length} research finding{research.length !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className={`research-chips ${className}`}>
      <div className="chips-header">
        <span className="header-icon">📚</span>
        <span className="header-title">
          Recommended Research ({research.length})
        </span>
      </div>

      <div className="chips-list">
        {displayResearch.map((result, index) => (
          <button
            key={`research-${index}`}
            className={`research-chip ${onSelect ? 'clickable' : ''}`}
            onClick={() => handleChipClick(result)}
            disabled={!onSelect}
          >
            <span className="chip-content">
              {truncateContent(result.content)}
            </span>
            {showScores && result.similarity !== undefined && (
              <span className={`chip-score ${getScoreClass(result.similarity)}`}>
                {(result.similarity * 100).toFixed(0)}%
              </span>
            )}
          </button>
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          className="chips-expand"
          onClick={() => setExpanded(true)}
        >
          +{remainingCount} more
        </button>
      )}

      {expanded && hasMore && (
        <button
          className="chips-collapse"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}

      {onSelect && (
        <div className="chips-hint">
          💡 Click a chip to inject into context
        </div>
      )}
    </div>
  );
};
