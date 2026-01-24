/**
 * BIOMETRIC STRESS ANALYSIS
 * Extracted stress calculation logic from useBiometricSensor.ts
 *
 * Functions for calculating stress levels from biometric indicators.
 */

import { StressIndicators } from '../kernel/types';
import { faceDetectionService } from '../faceDetectionService';
import {
  STRESS_WEIGHTS,
  EXPRESSION_STRESS_WEIGHTS,
  STRESS_HIGH_THRESHOLD,
  STRESS_LOW_THRESHOLD,
  STRESS_HIGH_DURATION_MS,
  STRESS_LOW_DURATION_MS,
  UI_MORPH_LOCKOUT_MS,
} from './types';

/**
 * Calculate stress indicators from current biometric state
 */
export const calculateStressIndicators = (
  getBlinkRate: () => number,
  getGazeStability: () => number,
  pupilDilation: number
): StressIndicators => {
  return {
    blinkRate: getBlinkRate(),
    pupilDilation,
    gazeStability: getGazeStability(),
  };
};

/**
 * Calculate stress score from indicators
 * Uses real facial expression data when available, falls back to eye metrics
 */
export const calculateStressScore = (indicators: StressIndicators): number => {
  // Use real facial expression stress estimation when available
  const faceStressEstimate = faceDetectionService.estimateStress();

  if (faceStressEstimate.confidence > 0.3) {
    // Blend real expression-based stress with eye metrics
    const expressionStress = faceStressEstimate.level;
    const eyeStress = faceStressEstimate.indicators.eyeStrainScore;

    // Calculate eye-metric based stress
    const normalizedBlink = Math.min(100, (indicators.blinkRate / 30) * 100);
    const normalizedStability = (1 - indicators.gazeStability) * 100;

    // Weighted combination: 40% expressions, 30% eye strain, 30% gaze metrics
    return (
      expressionStress * EXPRESSION_STRESS_WEIGHTS.expression +
      eyeStress * EXPRESSION_STRESS_WEIGHTS.eyeStrain +
      ((normalizedBlink + normalizedStability) / 2) * EXPRESSION_STRESS_WEIGHTS.gazeMetrics
    );
  }

  // Fallback to traditional calculation
  const normalizedBlink = Math.min(100, (indicators.blinkRate / 30) * 100);
  const normalizedPupil = indicators.pupilDilation * 100;
  const normalizedStability = (1 - indicators.gazeStability) * 100;

  return (
    normalizedBlink * STRESS_WEIGHTS.blinkRate +
    normalizedPupil * STRESS_WEIGHTS.pupilDilation +
    normalizedStability * STRESS_WEIGHTS.gazeStability
  );
};

/**
 * Determine stress trend from history
 */
export const determineTrend = (history: number[]): 'RISING' | 'STABLE' | 'FALLING' => {
  if (history.length < 3) return 'STABLE';
  const recent = history.slice(-3);
  const older = history.slice(-6, -3);
  if (older.length === 0) return 'STABLE';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 5) return 'RISING';
  if (diff < -5) return 'FALLING';
  return 'STABLE';
};

/**
 * Calculate cognitive load from stress level
 */
export const calculateCognitiveLoad = (stress: number): number => {
  return Math.min(100, stress * 0.7 + 30);
};

/**
 * Stress hysteresis state manager
 * Implements Protocol §2 to prevent jitter
 */
export class StressHysteresisManager {
  private stressHighStart: number | null = null;
  private stressLowStart: number | null = null;
  private isStressModeLocked = false;
  private lastUIMorphTime = 0;

  /**
   * Check if stress mode should change with hysteresis
   */
  check(currentStress: number): boolean {
    const now = Date.now();

    // Check if UI morphed recently (30s lockout)
    if (now - this.lastUIMorphTime < UI_MORPH_LOCKOUT_MS) {
      return this.isStressModeLocked;
    }

    if (currentStress >= STRESS_HIGH_THRESHOLD) {
      // Trying to enter stress mode
      this.stressLowStart = null;
      if (!this.stressHighStart) {
        this.stressHighStart = now;
      }
      // Only enter if sustained for 5 seconds
      if (now - this.stressHighStart >= STRESS_HIGH_DURATION_MS) {
        if (!this.isStressModeLocked) {
          this.isStressModeLocked = true;
          this.lastUIMorphTime = now;
        }
      }
    } else if (currentStress <= STRESS_LOW_THRESHOLD) {
      // Trying to exit stress mode
      this.stressHighStart = null;
      if (!this.stressLowStart) {
        this.stressLowStart = now;
      }
      // Only exit if sustained for 10 seconds
      if (now - this.stressLowStart >= STRESS_LOW_DURATION_MS) {
        if (this.isStressModeLocked) {
          this.isStressModeLocked = false;
          this.lastUIMorphTime = now;
        }
      }
    } else {
      // In the middle zone - reset timers
      this.stressHighStart = null;
      this.stressLowStart = null;
    }

    return this.isStressModeLocked;
  }

  reset(): void {
    this.stressHighStart = null;
    this.stressLowStart = null;
    this.isStressModeLocked = false;
    this.lastUIMorphTime = 0;
  }
}
