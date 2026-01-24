/**
 * GazeReticle.tsx
 *
 * Real-time gaze tracking reticle that follows user's eye position.
 * - Floating crosshair rendered at document level via portal
 * - Color changes: gray (tracking) → green (fixation detected)
 * - Shows confidence score and fixation duration
 * - Smooth interpolation for natural movement feel
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBiometricSensor, BiometricPerformance } from '../hooks/useBiometricSensor';

interface ReticleState {
  x: number;
  y: number;
  smoothX: number;
  smoothY: number;
  isFixating: boolean;
  fixationDuration: number;
  confidence: number;
  targetElement: string | null;
}

interface GazeReticleProps {
  enabled?: boolean;
  showConfidence?: boolean;
  showFixationTimer?: boolean;
  smoothing?: number; // 0-1, higher = smoother but more lag
  size?: number;
}

export const GazeReticle: React.FC<GazeReticleProps> = ({
  enabled = true,
  showConfidence = true,
  showFixationTimer = true,
  smoothing = 0.15,
  size = 48,
}) => {
  const [state, setState] = useState<ReticleState>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    smoothX: window.innerWidth / 2,
    smoothY: window.innerHeight / 2,
    isFixating: false,
    fixationDuration: 0,
    confidence: 0,
    targetElement: null,
  });

  const [performance, setPerformance] = useState<BiometricPerformance | null>(null);
  const [visible, setVisible] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Smooth position interpolation
  const smoothPosition = useCallback(() => {
    setState(prev => {
      const dx = prev.x - prev.smoothX;
      const dy = prev.y - prev.smoothY;

      // Only update if there's meaningful movement
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return prev;
      }

      return {
        ...prev,
        smoothX: prev.smoothX + dx * smoothing,
        smoothY: prev.smoothY + dy * smoothing,
      };
    });

    animationRef.current = requestAnimationFrame(smoothPosition);
  }, [smoothing]);

  // Listen for gaze updates from biometric sensor
  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    const handleGazeUpdate = (event: CustomEvent) => {
      const { x, y, confidence, isFixating, fixationDuration, targetElement } = event.detail;

      setState(prev => ({
        ...prev,
        x: x * window.innerWidth,
        y: y * window.innerHeight,
        isFixating,
        fixationDuration: fixationDuration || 0,
        confidence: confidence || 0,
        targetElement: targetElement || null,
      }));

      setVisible(true);
      lastUpdateRef.current = Date.now();
    };

    const handlePerformanceUpdate = (event: CustomEvent) => {
      setPerformance(event.detail);
    };

    // Start smoothing animation loop
    animationRef.current = requestAnimationFrame(smoothPosition);

    window.addEventListener('biometric-gaze-update' as any, handleGazeUpdate);
    window.addEventListener('biometric-performance' as any, handlePerformanceUpdate);

    // Hide reticle if no updates for 2 seconds
    const hideTimer = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 2000) {
        setVisible(false);
      }
    }, 500);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('biometric-gaze-update' as any, handleGazeUpdate);
      window.removeEventListener('biometric-performance' as any, handlePerformanceUpdate);
      clearInterval(hideTimer);
    };
  }, [enabled, smoothPosition]);

  if (!enabled || !visible) return null;

  // Determine reticle color based on state
  const getReticleColor = () => {
    if (state.isFixating) {
      // Green when fixating, intensity based on duration
      const intensity = Math.min(state.fixationDuration / 3, 1);
      return `rgba(34, 197, 94, ${0.6 + intensity * 0.4})`;
    }
    if (state.confidence > 0.7) {
      return 'rgba(250, 204, 21, 0.7)'; // Yellow - good tracking
    }
    if (state.confidence > 0.4) {
      return 'rgba(156, 163, 175, 0.6)'; // Gray - moderate
    }
    return 'rgba(239, 68, 68, 0.5)'; // Red - poor tracking
  };

  const reticleColor = getReticleColor();
  const pulseAnimation = state.isFixating ? 'reticle-pulse' : '';

  const reticleContent = (
    <div
      className="gaze-reticle-container"
      style={{
        position: 'fixed',
        left: state.smoothX - size / 2,
        top: state.smoothY - size / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 99999,
        transition: 'opacity 0.2s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Outer ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className={pulseAnimation}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          filter: state.isFixating ? `drop-shadow(0 0 8px ${reticleColor})` : 'none',
        }}
      >
        {/* Crosshair lines */}
        <line
          x1="24" y1="4" x2="24" y2="16"
          stroke={reticleColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="24" y1="32" x2="24" y2="44"
          stroke={reticleColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="4" y1="24" x2="16" y2="24"
          stroke={reticleColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="32" y1="24" x2="44" y2="24"
          stroke={reticleColor}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle
          cx="24"
          cy="24"
          r={state.isFixating ? 4 : 2}
          fill={reticleColor}
          style={{
            transition: 'r 0.15s ease',
          }}
        />

        {/* Outer circle - shows on fixation */}
        {state.isFixating && (
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={reticleColor}
            strokeWidth="1.5"
            strokeDasharray={`${(state.fixationDuration / 3) * 126} 126`}
            style={{
              transformOrigin: 'center',
              transform: 'rotate(-90deg)',
              transition: 'stroke-dasharray 0.1s linear',
            }}
          />
        )}
      </svg>

      {/* Info labels */}
      <div
        style={{
          position: 'absolute',
          top: size + 4,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Confidence indicator */}
        {showConfidence && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: reticleColor,
              padding: '2px 6px',
              borderRadius: '4px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {Math.round(state.confidence * 100)}%
          </div>
        )}

        {/* Fixation timer */}
        {showFixationTimer && state.isFixating && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              padding: '2px 6px',
              borderRadius: '4px',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
            }}
          >
            {state.fixationDuration.toFixed(1)}s
            {state.targetElement && (
              <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                → {state.targetElement}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes reticle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .reticle-pulse {
          animation: reticle-pulse 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  // Render via portal to document body
  return createPortal(reticleContent, document.body);
};

export default GazeReticle;
