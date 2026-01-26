/**
 * OptimalTimeIndicator - Show best time for task and current status
 * Displays optimal hour, current status, and reasoning
 */

import React from 'react';
import './styles/predictions.css';

export interface OptimalTimeIndicatorProps {
  optimalHour: number;
  currentHour?: number;
  isOptimalNow: boolean;
  reasoning: string;
  compact?: boolean;
  className?: string;
}

export const OptimalTimeIndicator: React.FC<OptimalTimeIndicatorProps> = ({
  optimalHour,
  currentHour = new Date().getHours(),
  isOptimalNow,
  reasoning,
  compact = false,
  className = '',
}) => {
  // Calculate wait time if not optimal now
  const calculateWaitTime = () => {
    if (isOptimalNow) return 0;

    let waitHours = optimalHour - currentHour;
    if (waitHours < 0) {
      waitHours += 24; // Next day
    }
    return waitHours;
  };

  const waitHours = calculateWaitTime();

  // Format hour for display (e.g., "20:00" or "8:00 PM")
  const formatHour = (hour: number, use24Hour = true) => {
    if (use24Hour) {
      return `${hour.toString().padStart(2, '0')}:00`;
    }
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  if (compact) {
    return (
      <div className={`optimal-time-indicator compact ${isOptimalNow ? 'optimal' : 'suboptimal'} ${className}`}>
        {isOptimalNow ? (
          <span className="compact-optimal">
            ✅ Optimal Time
          </span>
        ) : (
          <span className="compact-suboptimal">
            ⏳ Wait {waitHours}h ({formatHour(optimalHour)})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`optimal-time-indicator ${isOptimalNow ? 'timing-optimal' : 'timing-suboptimal'} ${className}`}>
      <div className="indicator-header">
        <span className="header-icon">⏰</span>
        <span className="header-title">Optimal Timing</span>
      </div>

      <div className="time-display">
        <div className="optimal-time">
          <span className="time-label">Best Time:</span>
          <span className="time-value">{formatHour(optimalHour)}</span>
        </div>

        <div className="current-status">
          {isOptimalNow ? (
            <div className="status-optimal">
              <span className="status-icon">✅</span>
              <span className="status-text">You're in the optimal window!</span>
            </div>
          ) : (
            <div className="status-suboptimal">
              <span className="status-icon">⏳</span>
              <span className="status-text">
                Wait {waitHours} hour{waitHours !== 1 ? 's' : ''} for better results
              </span>
            </div>
          )}
        </div>
      </div>

      {reasoning && (
        <div className="time-reasoning">
          <span className="reasoning-icon">💭</span>
          <span className="reasoning-text">{reasoning}</span>
        </div>
      )}

      {!isOptimalNow && (
        <div className="time-comparison">
          <div className="comparison-item">
            <span className="comparison-label">Current:</span>
            <span className="comparison-value">{formatHour(currentHour)}</span>
          </div>
          <div className="comparison-arrow">→</div>
          <div className="comparison-item">
            <span className="comparison-label">Optimal:</span>
            <span className="comparison-value">{formatHour(optimalHour)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
