/**
 * BIOMETRIC SERVICE TYPES
 * Extracted from useBiometricSensor.ts for better modularity.
 */

import { GazePoint, StressIndicators } from '../kernel/types';

// Performance metrics interface
export interface BiometricPerformance {
  fps: number;
  targetFps: number;
  frameTime: number;
  processingLatency: number;
  droppedFrames: number;
  gazeConfidence: number;
  stressConfidence: number;
  overallConfidence: number;
  lightingQuality: number; // 0-100
  lightingStatus: 'GOOD' | 'LOW' | 'VERY_LOW';
  faceDetected: boolean;
}

// Default performance state
export const DEFAULT_PERFORMANCE: BiometricPerformance = {
  fps: 0,
  targetFps: 60,
  frameTime: 0,
  processingLatency: 0,
  droppedFrames: 0,
  gazeConfidence: 0,
  stressConfidence: 0,
  overallConfidence: 0,
  lightingQuality: 100,
  lightingStatus: 'GOOD',
  faceDetected: false,
};

// Stabilization constants (Protocol §1, §2, §4)
export const CONFIDENCE_BUFFER_SIZE = 10;
export const STRESS_HIGH_THRESHOLD = 70;
export const STRESS_LOW_THRESHOLD = 50;
export const STRESS_HIGH_DURATION_MS = 5000;  // 5 seconds to enter
export const STRESS_LOW_DURATION_MS = 10000;  // 10 seconds to exit
export const UI_MORPH_LOCKOUT_MS = 30000;     // 30 second lockout
export const LOW_FPS_THRESHOLD = 15;
export const LOW_FPS_DURATION_MS = 5000;

// Gaze processing thresholds
export const FIXATION_DISPERSION_THRESHOLD = 50; // pixels
export const GAZE_HISTORY_MAX = 100;
export const GAZE_HISTORY_TRIM = 50;
export const FIXATION_HISTORY_MAX = 20;
export const FIXATION_HISTORY_TRIM = 10;

// Stress calculation weights
export const STRESS_WEIGHTS = {
  blinkRate: 0.3,
  pupilDilation: 0.4,
  gazeStability: 0.3,
};

// Expression-based stress blend weights
export const EXPRESSION_STRESS_WEIGHTS = {
  expression: 0.4,
  eyeStrain: 0.3,
  gazeMetrics: 0.3,
};

// Lighting analysis thresholds
export const LIGHTING_THRESHOLDS = {
  veryLow: 30,
  low: 50,
};

// Result of lighting analysis
export interface LightingAnalysisResult {
  lightingQuality: number;
  lightingStatus: 'GOOD' | 'LOW' | 'VERY_LOW';
}

// Result of stress calculation
export interface StressCalculationResult {
  rawStress: number;
  smoothedStress: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  confidence: number;
}

// Centroid calculation result
export interface Centroid {
  x: number;
  y: number;
}
