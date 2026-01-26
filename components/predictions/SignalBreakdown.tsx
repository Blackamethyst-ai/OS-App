/**
 * SignalBreakdown - Advanced signal display for power users
 * Shows detailed correlation signal breakdown with weights
 */

import React, { useState } from 'react';
import './styles/predictions.css';

export interface SignalBreakdownProps {
  signals: {
    outcome_score: number;
    cognitive_alignment: number;
    research_availability: number;
    error_probability: number;
  };
  showWeights?: boolean;
  className?: string;
}

interface SignalDefinition {
  key: keyof SignalBreakdownProps['signals'];
  label: string;
  weight: number;
  description: string;
  isNegative?: boolean;
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    key: 'outcome_score',
    label: 'Outcome Match',
    weight: 0.5,
    description: 'Historical success rate for similar tasks',
  },
  {
    key: 'cognitive_alignment',
    label: 'Cognitive Fit',
    weight: 0.3,
    description: 'Current cognitive state vs optimal state',
  },
  {
    key: 'research_availability',
    label: 'Research Ready',
    weight: 0.15,
    description: 'Relevant research findings available',
  },
  {
    key: 'error_probability',
    label: 'Error Risk',
    weight: 0.05,
    description: 'Likelihood of encountering preventable errors',
    isNegative: true,
  },
];

export const SignalBreakdown: React.FC<SignalBreakdownProps> = ({
  signals,
  showWeights = false,
  className = '',
}) => {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  // Calculate combined score
  const calculateCombinedScore = () => {
    let score = 0;
    SIGNAL_DEFINITIONS.forEach((def) => {
      const value = signals[def.key];
      if (def.isNegative) {
        score -= value * def.weight;
      } else {
        score += value * def.weight;
      }
    });
    return Math.max(0, Math.min(1, score));
  };

  const combinedScore = calculateCombinedScore();

  const getSignalClass = (value: number, isNegative?: boolean) => {
    if (isNegative) {
      if (value < 0.3) return 'signal-good';
      if (value < 0.6) return 'signal-medium';
      return 'signal-bad';
    }
    if (value >= 0.7) return 'signal-good';
    if (value >= 0.4) return 'signal-medium';
    return 'signal-bad';
  };

  const toggleSignalExpansion = (key: string) => {
    setExpandedSignal(expandedSignal === key ? null : key);
  };

  return (
    <div className={`signal-breakdown ${className}`}>
      <div className="breakdown-header">
        <span className="header-icon">📊</span>
        <span className="header-title">Prediction Signals</span>
      </div>

      <div className="signals-list">
        {SIGNAL_DEFINITIONS.map((def) => {
          const value = signals[def.key];
          const isExpanded = expandedSignal === def.key;

          return (
            <div
              key={def.key}
              className={`signal-item ${getSignalClass(value, def.isNegative)}`}
            >
              <button
                className="signal-header"
                onClick={() => toggleSignalExpansion(def.key)}
              >
                <span className="signal-label">{def.label}</span>
                <div className="signal-progress-container">
                  <div className="signal-progress">
                    <div
                      className={`signal-fill ${def.isNegative ? 'negative' : ''}`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <span className="signal-value">
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
                {showWeights && (
                  <span className="signal-weight">
                    {def.isNegative ? '-' : ''}
                    {(def.weight * 100).toFixed(0)}% weight
                  </span>
                )}
                <span className="signal-expand-icon">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isExpanded && (
                <div className="signal-details">
                  <p className="signal-description">{def.description}</p>

                  <div className="signal-interpretation">
                    <strong>Interpretation:</strong>
                    {def.isNegative ? (
                      <>
                        {value < 0.3 && ' Low risk of errors - good to proceed'}
                        {value >= 0.3 && value < 0.6 && ' Moderate error risk - review warnings'}
                        {value >= 0.6 && ' High error risk - consider prevention strategies'}
                      </>
                    ) : (
                      <>
                        {value >= 0.7 && ' Strong signal - favorable conditions'}
                        {value >= 0.4 && value < 0.7 && ' Moderate signal - acceptable conditions'}
                        {value < 0.4 && ' Weak signal - less favorable conditions'}
                      </>
                    )}
                  </div>

                  <div className="signal-contribution">
                    <strong>Contribution to overall score:</strong>
                    {' '}
                    {def.isNegative ? '-' : '+'}
                    {(value * def.weight * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="combined-score">
        <div className="score-label">Combined Confidence</div>
        <div className="score-display">
          <div className="score-bar">
            <div
              className="score-fill"
              style={{ width: `${combinedScore * 100}%` }}
            />
          </div>
          <div className="score-value">
            {(combinedScore * 100).toFixed(0)}%
          </div>
        </div>
        <div className="score-interpretation">
          {combinedScore >= 0.7 && '✅ High confidence - proceed with confidence'}
          {combinedScore >= 0.5 && combinedScore < 0.7 && '🟡 Moderate confidence - acceptable'}
          {combinedScore < 0.5 && '⚠️ Low confidence - consider waiting'}
        </div>
      </div>

      {showWeights && (
        <div className="breakdown-info">
          <details>
            <summary>ℹ️ How signals are weighted</summary>
            <div className="info-content">
              <p>
                The prediction system uses a weighted combination of signals:
              </p>
              <ul>
                <li><strong>Outcome Match (50%):</strong> Historical success patterns</li>
                <li><strong>Cognitive Fit (30%):</strong> Current mental state alignment</li>
                <li><strong>Research Ready (15%):</strong> Available knowledge</li>
                <li><strong>Error Risk (5% penalty):</strong> Preventable error likelihood</li>
              </ul>
              <p>
                These weights are calibrated based on prediction accuracy over time.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
