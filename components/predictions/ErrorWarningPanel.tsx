/**
 * ErrorWarningPanel - Display potential errors with prevention strategies
 * Shows predicted errors with solutions and prevention success rates
 */

import React, { useState } from 'react';
import type { ErrorPattern } from '@antigravity/agent-core-sdk';
import './styles/predictions.css';

export interface ErrorWarningPanelProps {
  errors: ErrorPattern[];
  onDismiss?: (errorType: string) => void;
  compact?: boolean;
  maxDisplay?: number;
  className?: string;
}

export const ErrorWarningPanel: React.FC<ErrorWarningPanelProps> = ({
  errors,
  onDismiss,
  compact = false,
  maxDisplay = 3,
  className = '',
}) => {
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  if (!errors || errors.length === 0) {
    return null;
  }

  // Filter out dismissed errors
  const visibleErrors = errors.filter(
    (error) => !dismissedErrors.has(error.error_type)
  );

  if (visibleErrors.length === 0) {
    return null;
  }

  const handleDismiss = (errorType: string) => {
    setDismissedErrors(new Set([...dismissedErrors, errorType]));
    onDismiss?.(errorType);
  };

  const getSeverityEmoji = (severity: 'high' | 'medium') => {
    return severity === 'high' ? '🔴' : '🟡';
  };

  const getSeverityClass = (severity: 'high' | 'medium') => {
    return severity === 'high' ? 'error-high' : 'error-medium';
  };

  const displayErrors = visibleErrors.slice(0, maxDisplay);
  const hasMore = visibleErrors.length > maxDisplay;

  if (compact) {
    return (
      <div className={`error-warning-panel compact ${className}`}>
        <div className="panel-header">
          ⚠️ {visibleErrors.length} Potential Error{visibleErrors.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  return (
    <div className={`error-warning-panel ${className}`}>
      <div className="panel-header">
        <span className="header-icon">⚠️</span>
        <span className="header-title">
          Potential Errors ({visibleErrors.length})
        </span>
      </div>

      <div className="errors-list">
        {displayErrors.map((error) => (
          <div
            key={error.error_type}
            className={`error-item ${getSeverityClass(error.severity)}`}
          >
            <div className="error-header">
              <span className="error-emoji">{getSeverityEmoji(error.severity)}</span>
              <span className="error-type">
                {error.error_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="error-prevention">
                {Math.round(error.success_rate * 100)}% preventable
              </span>
              {onDismiss && (
                <button
                  className="error-dismiss"
                  onClick={() => handleDismiss(error.error_type)}
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              )}
            </div>

            {error.context && (
              <div className="error-context">{error.context}</div>
            )}

            {error.solution && (
              <div className="error-solution">
                <span className="solution-icon">💡</span>
                <span className="solution-text">
                  {error.solution.split('\n')[0]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="errors-more">
          +{visibleErrors.length - maxDisplay} more error{visibleErrors.length - maxDisplay !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
