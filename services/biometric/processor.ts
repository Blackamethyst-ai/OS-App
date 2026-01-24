/**
 * BIOMETRIC PROCESSOR
 * Extracted gaze processing and lighting analysis from useBiometricSensor.ts
 *
 * Handles gaze point calculations, fixation detection, and lighting analysis.
 */

import { GazePoint, GazeFixation } from '../kernel/types';
import {
  Centroid,
  LightingAnalysisResult,
  FIXATION_DISPERSION_THRESHOLD,
  LIGHTING_THRESHOLDS,
  CONFIDENCE_BUFFER_SIZE,
  LOW_FPS_THRESHOLD,
  LOW_FPS_DURATION_MS,
} from './types';

// ============================================================================
// GAZE GEOMETRY CALCULATIONS
// ============================================================================

/**
 * Calculate centroid of gaze points
 */
export const calculateCentroid = (points: GazePoint[]): Centroid => {
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
};

/**
 * Calculate dispersion (max distance from centroid)
 */
export const calculateDispersion = (
  points: GazePoint[],
  centroid: Centroid
): number => {
  const distances = points.map(p =>
    Math.sqrt(Math.pow(p.x - centroid.x, 2) + Math.pow(p.y - centroid.y, 2))
  );
  return Math.max(...distances);
};

/**
 * Get element at screen coordinates
 */
export const getElementAtPoint = (x: number, y: number): string | undefined => {
  const element = document.elementFromPoint(x, y);
  return element?.id ||
         element?.getAttribute('data-biometric-id') ||
         element?.closest('[data-biometric-id]')?.getAttribute('data-biometric-id') ||
         undefined;
};

/**
 * Calculate gaze stability from history (0-1 scale)
 */
export const calculateGazeStability = (gazeHistory: GazePoint[]): number => {
  if (gazeHistory.length < 5) return 1;

  const recent = gazeHistory.slice(-10);
  const centroid = calculateCentroid(recent);
  const dispersion = calculateDispersion(recent, centroid);

  return Math.max(0, 1 - dispersion / 200);
};

/**
 * Check if current gaze represents a fixation
 */
export const isFixating = (
  recentPoints: GazePoint[],
  threshold: number = FIXATION_DISPERSION_THRESHOLD
): boolean => {
  if (recentPoints.length < 5) return false;
  const centroid = calculateCentroid(recentPoints);
  const dispersion = calculateDispersion(recentPoints, centroid);
  return dispersion < threshold;
};

// ============================================================================
// LIGHTING ANALYSIS
// ============================================================================

/**
 * Analyze lighting from video frame
 */
export const analyzeLighting = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): LightingAnalysisResult => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { lightingQuality: 100, lightingStatus: 'GOOD' };
  }

  // Draw scaled video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Sample brightness from pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalBrightness = 0;
  const sampleStep = 16; // Sample every 16th pixel for speed
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    // Calculate perceived brightness (weighted RGB)
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
    totalBrightness += brightness;
    sampleCount++;
  }

  const avgBrightness = totalBrightness / sampleCount;
  const lightingQuality = Math.min(100, (avgBrightness / 55) * 150);

  let lightingStatus: 'GOOD' | 'LOW' | 'VERY_LOW' = 'GOOD';
  if (lightingQuality < LIGHTING_THRESHOLDS.veryLow) {
    lightingStatus = 'VERY_LOW';
  } else if (lightingQuality < LIGHTING_THRESHOLDS.low) {
    lightingStatus = 'LOW';
  }

  return {
    lightingQuality: Math.round(lightingQuality),
    lightingStatus,
  };
};

// ============================================================================
// CONFIDENCE SMOOTHING
// ============================================================================

/**
 * Confidence buffer manager for moving average smoothing (Protocol §1)
 */
export class ConfidenceBuffer {
  private buffer: number[] = [];
  private readonly size: number;

  constructor(size: number = CONFIDENCE_BUFFER_SIZE) {
    this.size = size;
  }

  /**
   * Add value and get smoothed average
   */
  add(rawConfidence: number): number {
    this.buffer.push(rawConfidence);

    // Keep only last N frames
    if (this.buffer.length > this.size) {
      this.buffer = this.buffer.slice(-this.size);
    }

    // Return average
    const sum = this.buffer.reduce((a, b) => a + b, 0);
    return sum / this.buffer.length;
  }

  reset(): void {
    this.buffer = [];
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance monitor for auto-disabling overlays (Protocol §4)
 */
export class PerformanceMonitor {
  private lowFpsStart: number | null = null;
  private overlaysDisabled = false;
  private onOverlaysDisabled?: (disabled: boolean) => void;

  constructor(onOverlaysDisabled?: (disabled: boolean) => void) {
    this.onOverlaysDisabled = onOverlaysDisabled;
  }

  /**
   * Check FPS and manage overlay state
   */
  check(currentFps: number): boolean {
    const now = Date.now();

    if (currentFps < LOW_FPS_THRESHOLD) {
      if (!this.lowFpsStart) {
        this.lowFpsStart = now;
      }
      // Disable overlays after 5 seconds of low FPS
      if (now - this.lowFpsStart >= LOW_FPS_DURATION_MS && !this.overlaysDisabled) {
        this.overlaysDisabled = true;
        this.onOverlaysDisabled?.(true);
        window.dispatchEvent(new CustomEvent('biometric-performance-mode', {
          detail: { overlaysDisabled: true }
        }));
      }
    } else {
      this.lowFpsStart = null;
      // Re-enable overlays if FPS recovers
      if (this.overlaysDisabled && currentFps >= LOW_FPS_THRESHOLD + 5) {
        this.overlaysDisabled = false;
        this.onOverlaysDisabled?.(false);
        window.dispatchEvent(new CustomEvent('biometric-performance-mode', {
          detail: { overlaysDisabled: false }
        }));
      }
    }

    return this.overlaysDisabled;
  }

  isOverlaysDisabled(): boolean {
    return this.overlaysDisabled;
  }

  reset(): void {
    this.lowFpsStart = null;
    this.overlaysDisabled = false;
  }
}

// ============================================================================
// EVENT EMITTERS
// ============================================================================

/**
 * Emit fixation event for glow effects
 */
export const emitFixationEvent = (
  elementId: string | undefined,
  isFixating: boolean,
  duration: number
): void => {
  if (!elementId) return;

  const event = new CustomEvent('biometric-fixation', {
    detail: { elementId, isFixating, duration }
  });
  window.dispatchEvent(event);
};

/**
 * Emit real-time gaze position for GazeReticle component
 */
export const emitGazeUpdateEvent = (
  x: number,
  y: number,
  confidence: number,
  isFixating: boolean,
  fixationDuration: number,
  targetElement?: string
): void => {
  const event = new CustomEvent('biometric-gaze-update', {
    detail: {
      x: x / window.innerWidth, // Normalized 0-1
      y: y / window.innerHeight,
      confidence,
      isFixating,
      fixationDuration,
      targetElement,
    }
  });
  window.dispatchEvent(event);
};

/**
 * Emit fallback notification
 */
export const emitBiometricFallback = (
  reason: string,
  message: string
): void => {
  window.dispatchEvent(new CustomEvent('biometric-fallback', {
    detail: { reason, message }
  }));
};
