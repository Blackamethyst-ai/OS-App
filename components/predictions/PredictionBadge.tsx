/**
 * PredictionBadge - Quality and success probability indicator
 * Shows prediction quality as stars and success percentage
 */

import React from 'react';
import './styles/predictions.css';

export interface PredictionBadgeProps {
  quality: number;        // 1-5 scale
  successRate: number;    // 0-1 scale
  confidence: number;     // 0-1 scale
  compact?: boolean;
  className?: string;
}

export const PredictionBadge: React.FC<PredictionBadgeProps> = ({
  quality,
  successRate,
  confidence,
  compact = false,
  className = '',
}) => {
  // Determine quality tier for styling
  const getQualityClass = () => {
    if (quality >= 4.0) return 'prediction-quality-high';
    if (quality >= 3.0) return 'prediction-quality-medium';
    return 'prediction-quality-low';
  };

  // Generate star display
  const renderStars = () => {
    const fullStars = Math.floor(quality);
    const hasHalfStar = quality % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`star-${i}`}>⭐</span>);
    }
    if (hasHalfStar && fullStars < 5) {
      stars.push(<span key="half-star" className="half-star">⭐</span>);
    }

    return stars;
  };

  // Format percentages
  const successPercent = Math.round(successRate * 100);
  const confidencePercent = Math.round(confidence * 100);

  // Determine emoji indicator
  const getEmoji = () => {
    if (quality >= 4.0) return '🟢';
    if (quality >= 3.0) return '🟡';
    return '🔴';
  };

  if (compact) {
    return (
      <div className={`prediction-badge compact ${getQualityClass()} ${className}`}>
        <span className="badge-emoji">{getEmoji()}</span>
        <span className="badge-quality">{quality.toFixed(1)}★</span>
        <span className="badge-divider">|</span>
        <span className="badge-success">{successPercent}%</span>
      </div>
    );
  }

  return (
    <div className={`prediction-badge ${getQualityClass()} ${className}`}>
      <div className="badge-header">
        <span className="badge-emoji">{getEmoji()}</span>
        <span className="badge-title">Prediction</span>
      </div>

      <div className="badge-quality-display">
        <div className="quality-stars">{renderStars()}</div>
        <div className="quality-score">{quality.toFixed(1)}/5</div>
      </div>

      <div className="badge-metrics">
        <div className="metric">
          <span className="metric-label">Success:</span>
          <span className="metric-value">{successPercent}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">Confidence:</span>
          <span className="metric-value">{confidencePercent}%</span>
        </div>
      </div>
    </div>
  );
};
