/**
 * PredictionPanel - Composite prediction display
 * Combines all prediction components into a unified panel
 */

import React from 'react';
import { usePredictionWithContext } from '@antigravity/agent-core-sdk';
import { PredictionBadge } from './PredictionBadge';
import { ErrorWarningPanel } from './ErrorWarningPanel';
import { OptimalTimeIndicator } from './OptimalTimeIndicator';
import { ResearchChips } from './ResearchChips';
import type { SearchResult } from '@antigravity/agent-core-sdk';
import './styles/predictions.css';

export interface PredictionPanelProps {
  intent: string;
  track?: boolean;
  showErrors?: boolean;
  showTiming?: boolean;
  showResearch?: boolean;
  onStartTask?: () => void;
  onScheduleLater?: () => void;
  onSelectResearch?: (result: SearchResult) => void;
  className?: string;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  intent,
  track = false,
  showErrors = true,
  showTiming = true,
  showResearch = true,
  onStartTask,
  onScheduleLater,
  onSelectResearch,
  className = '',
}) => {
  const { data, isLoading, error } = usePredictionWithContext({
    intent,
    track,
    includeErrors: showErrors,
    includeOptimalTime: showTiming,
    debounceMs: 500,
  });

  if (!intent || intent.length < 3) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`prediction-panel loading ${className}`}>
        <div className="panel-loader">
          <div className="loader-spinner">⏳</div>
          <div className="loader-text">Analyzing task predictions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`prediction-panel error ${className}`}>
        <div className="panel-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">
            Failed to load predictions: {error.message}
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { prediction, errors, optimalTime } = data;

  // Determine if conditions are favorable
  const isFavorable =
    prediction.success_probability >= 0.7 &&
    (!optimalTime || optimalTime.is_optimal_now);

  return (
    <div className={`prediction-panel ${className}`}>
      <div className="panel-header">
        <span className="header-icon">🔮</span>
        <span className="header-title">Session Prediction</span>
      </div>

      <div className="panel-content">
        {/* Quality and Success Badge */}
        <div className="panel-section">
          <PredictionBadge
            quality={prediction.predicted_quality}
            successRate={prediction.success_probability}
            confidence={prediction.confidence}
          />
        </div>

        {/* Error Warnings */}
        {showErrors && errors && errors.count > 0 && (
          <div className="panel-section">
            <ErrorWarningPanel errors={errors.errors} maxDisplay={3} />
          </div>
        )}

        {/* Optimal Timing */}
        {showTiming && optimalTime && (
          <div className="panel-section">
            <OptimalTimeIndicator
              optimalHour={optimalTime.optimal_hour}
              isOptimalNow={optimalTime.is_optimal_now}
              reasoning={optimalTime.reasoning}
            />
          </div>
        )}

        {/* Recommended Research */}
        {showResearch && prediction.recommended_research.length > 0 && (
          <div className="panel-section">
            <ResearchChips
              research={prediction.recommended_research}
              onSelect={onSelectResearch}
              maxDisplay={3}
            />
          </div>
        )}

        {/* Signal Breakdown (collapsed by default) */}
        {prediction.signals && (
          <details className="panel-section signals-section">
            <summary className="signals-toggle">
              📊 View Signal Breakdown
            </summary>
            <div className="signals-content">
              <div className="signal-bar">
                <span className="signal-label">Outcome Match</span>
                <div className="signal-progress">
                  <div
                    className="signal-fill"
                    style={{ width: `${prediction.signals.outcome_score * 100}%` }}
                  />
                </div>
                <span className="signal-value">
                  {(prediction.signals.outcome_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="signal-bar">
                <span className="signal-label">Cognitive Fit</span>
                <div className="signal-progress">
                  <div
                    className="signal-fill"
                    style={{ width: `${prediction.signals.cognitive_alignment * 100}%` }}
                  />
                </div>
                <span className="signal-value">
                  {(prediction.signals.cognitive_alignment * 100).toFixed(0)}%
                </span>
              </div>
              <div className="signal-bar">
                <span className="signal-label">Research Ready</span>
                <div className="signal-progress">
                  <div
                    className="signal-fill"
                    style={{ width: `${prediction.signals.research_availability * 100}%` }}
                  />
                </div>
                <span className="signal-value">
                  {(prediction.signals.research_availability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="signal-bar">
                <span className="signal-label">Error Risk</span>
                <div className="signal-progress">
                  <div
                    className="signal-fill error-fill"
                    style={{ width: `${prediction.signals.error_probability * 100}%` }}
                  />
                </div>
                <span className="signal-value">
                  {(prediction.signals.error_probability * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </details>
        )}
      </div>

      {/* Action Buttons */}
      {(onStartTask || onScheduleLater) && (
        <div className="panel-actions">
          {onStartTask && (
            <button
              className={`action-button primary ${!isFavorable ? 'warning' : ''}`}
              onClick={onStartTask}
            >
              {isFavorable ? '✅ Start Now' : '⚠️ Start Anyway'}
            </button>
          )}
          {onScheduleLater && !isFavorable && (
            <button
              className="action-button secondary"
              onClick={onScheduleLater}
            >
              ⏰ Schedule for Later
            </button>
          )}
        </div>
      )}
    </div>
  );
};
