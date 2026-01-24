/**
 * BIOMETRIC SERVICES
 * Extracted from useBiometricSensor.ts for better modularity.
 */

// Types
export * from './types';

// Stress analysis
export {
  calculateStressIndicators,
  calculateStressScore,
  determineTrend,
  calculateCognitiveLoad,
  StressHysteresisManager,
} from './stressAnalysis';

// Processing
export {
  calculateCentroid,
  calculateDispersion,
  getElementAtPoint,
  calculateGazeStability,
  isFixating,
  analyzeLighting,
  ConfidenceBuffer,
  PerformanceMonitor,
  emitFixationEvent,
  emitGazeUpdateEvent,
  emitBiometricFallback,
} from './processor';
