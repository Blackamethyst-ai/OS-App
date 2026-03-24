import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mocks for use inside vi.mock() factories
const mockEstimateStress = vi.hoisted(() => vi.fn());

vi.mock('../../faceDetectionService', () => ({
  faceDetectionService: {
    estimateStress: mockEstimateStress,
  },
}));

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  calculateCentroid,
  calculateDispersion,
  calculateGazeStability,
  isFixating,
  ConfidenceBuffer,
  PerformanceMonitor,
} from '../processor';

import {
  calculateStressIndicators,
  calculateStressScore,
  determineTrend,
  calculateCognitiveLoad,
  StressHysteresisManager,
} from '../stressAnalysis';

import type { GazePoint } from '../../kernel/types';

// ---------------------------------------------------------------------------
// Helper: create a GazePoint
// ---------------------------------------------------------------------------
const makeGaze = (x: number, y: number, confidence = 1): GazePoint => ({
  x,
  y,
  timestamp: Date.now(),
  confidence,
});

// ===========================================================================
// PROCESSOR TESTS
// ===========================================================================

describe('BiometricProcessor', () => {
  // ---- calculateCentroid --------------------------------------------------
  describe('calculateCentroid', () => {
    it('returns the average x and y of the given points', () => {
      const points = [makeGaze(0, 0), makeGaze(10, 20), makeGaze(20, 40)];
      const centroid = calculateCentroid(points);
      expect(centroid.x).toBe(10);
      expect(centroid.y).toBe(20);
    });

    it('returns the point itself for a single-element array', () => {
      const centroid = calculateCentroid([makeGaze(7, 13)]);
      expect(centroid.x).toBe(7);
      expect(centroid.y).toBe(13);
    });
  });

  // ---- calculateDispersion ------------------------------------------------
  describe('calculateDispersion', () => {
    it('returns 0 when all points are at the centroid', () => {
      const points = [makeGaze(5, 5), makeGaze(5, 5)];
      const centroid = calculateCentroid(points);
      expect(calculateDispersion(points, centroid)).toBe(0);
    });

    it('returns max distance from centroid', () => {
      const points = [makeGaze(0, 0), makeGaze(10, 0)];
      const centroid = calculateCentroid(points); // {5, 0}
      const dispersion = calculateDispersion(points, centroid);
      expect(dispersion).toBe(5);
    });
  });

  // ---- calculateGazeStability ---------------------------------------------
  describe('calculateGazeStability', () => {
    it('returns 1 when fewer than 5 points', () => {
      const points = [makeGaze(0, 0), makeGaze(1, 1)];
      expect(calculateGazeStability(points)).toBe(1);
    });

    it('returns high stability for tightly clustered points', () => {
      const points = Array.from({ length: 10 }, () => makeGaze(100, 100));
      expect(calculateGazeStability(points)).toBe(1);
    });

    it('returns lower stability for dispersed points', () => {
      const points = Array.from({ length: 10 }, (_, i) =>
        makeGaze(i * 50, i * 50),
      );
      const stability = calculateGazeStability(points);
      expect(stability).toBeLessThan(1);
    });
  });

  // ---- isFixating ---------------------------------------------------------
  describe('isFixating', () => {
    it('returns false when fewer than 5 points', () => {
      expect(isFixating([makeGaze(0, 0)])).toBe(false);
    });

    it('returns true when points are within dispersion threshold', () => {
      const points = Array.from({ length: 6 }, () => makeGaze(100, 100));
      expect(isFixating(points)).toBe(true);
    });

    it('returns false when points are widely dispersed', () => {
      const points = Array.from({ length: 6 }, (_, i) =>
        makeGaze(i * 200, i * 200),
      );
      expect(isFixating(points)).toBe(false);
    });
  });

  // ---- ConfidenceBuffer ---------------------------------------------------
  describe('ConfidenceBuffer', () => {
    it('returns the smoothed moving average', () => {
      const buf = new ConfidenceBuffer(3);
      expect(buf.add(10)).toBe(10); // [10] => 10
      expect(buf.add(20)).toBe(15); // [10,20] => 15
      expect(buf.add(30)).toBe(20); // [10,20,30] => 20
      // Exceeds buffer size of 3 — oldest is dropped
      expect(buf.add(40)).toBe(30); // [20,30,40] => 30
    });

    it('resets the buffer', () => {
      const buf = new ConfidenceBuffer(5);
      buf.add(50);
      buf.add(60);
      buf.reset();
      expect(buf.add(10)).toBe(10);
    });
  });

  // ---- PerformanceMonitor -------------------------------------------------
  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('disables overlays after sustained low FPS', () => {
      const callback = vi.fn();
      const monitor = new PerformanceMonitor(callback);

      // Low FPS for 5 seconds
      monitor.check(10);
      vi.advanceTimersByTime(5000);
      const result = monitor.check(10);

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('does not disable overlays if FPS recovers before threshold', () => {
      const monitor = new PerformanceMonitor();
      monitor.check(10);
      vi.advanceTimersByTime(3000);
      // FPS recovers
      monitor.check(30);
      vi.advanceTimersByTime(3000);
      expect(monitor.check(30)).toBe(false);
    });

    it('re-enables overlays when FPS recovers above threshold + 5', () => {
      const callback = vi.fn();
      const monitor = new PerformanceMonitor(callback);

      // Enter low-FPS mode
      monitor.check(10);
      vi.advanceTimersByTime(5000);
      monitor.check(10);
      expect(monitor.isOverlaysDisabled()).toBe(true);

      // Recover
      monitor.check(25); // >= 15+5
      expect(monitor.isOverlaysDisabled()).toBe(false);
      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});

// ===========================================================================
// STRESS ANALYSIS TESTS
// ===========================================================================

describe('StressAnalysis', () => {
  beforeEach(() => {
    mockEstimateStress.mockReset();
  });

  // ---- calculateStressIndicators ------------------------------------------
  describe('calculateStressIndicators', () => {
    it('assembles indicators from callbacks and value', () => {
      const indicators = calculateStressIndicators(
        () => 20,
        () => 0.8,
        0.5,
      );
      expect(indicators).toEqual({
        blinkRate: 20,
        pupilDilation: 0.5,
        gazeStability: 0.8,
      });
    });
  });

  // ---- calculateStressScore (fallback path) -------------------------------
  describe('calculateStressScore', () => {
    it('uses traditional formula when face confidence is low', () => {
      mockEstimateStress.mockReturnValue({
        level: 0,
        confidence: 0, // below 0.3 threshold
        indicators: { eyeStrainScore: 0, blinkRate: 0, expressionTension: 0 },
      });

      const score = calculateStressScore({
        blinkRate: 15, // normalized: min(100, 15/30*100) = 50
        pupilDilation: 0.5, // normalized: 50
        gazeStability: 0.5, // normalized: (1-0.5)*100 = 50
      });

      // 50*0.3 + 50*0.4 + 50*0.3 = 15 + 20 + 15 = 50
      expect(score).toBe(50);
    });

    it('blends expression data when face confidence exceeds threshold', () => {
      mockEstimateStress.mockReturnValue({
        level: 60,
        confidence: 0.8,
        indicators: { eyeStrainScore: 40, blinkRate: 10, expressionTension: 30 },
      });

      const score = calculateStressScore({
        blinkRate: 15,
        pupilDilation: 0.5,
        gazeStability: 0.5,
      });

      // expression: 60*0.4=24, eyeStrain: 40*0.3=12,
      // gaze: ((50+50)/2)*0.3 = 15 => total = 51
      expect(score).toBeCloseTo(51, 0);
    });
  });

  // ---- determineTrend -----------------------------------------------------
  describe('determineTrend', () => {
    it('returns STABLE for fewer than 3 data points', () => {
      expect(determineTrend([10, 20])).toBe('STABLE');
    });

    it('returns STABLE when no older window exists', () => {
      expect(determineTrend([50, 50, 50])).toBe('STABLE');
    });

    it('returns RISING when recent average exceeds older by > 5', () => {
      // older window: [10,10,10] avg=10, recent: [20,20,20] avg=20, diff=10>5
      expect(determineTrend([10, 10, 10, 20, 20, 20])).toBe('RISING');
    });

    it('returns FALLING when recent average is below older by > 5', () => {
      expect(determineTrend([50, 50, 50, 40, 40, 40])).toBe('FALLING');
    });

    it('returns STABLE when difference is within threshold', () => {
      expect(determineTrend([50, 50, 50, 52, 52, 52])).toBe('STABLE');
    });
  });

  // ---- calculateCognitiveLoad ---------------------------------------------
  describe('calculateCognitiveLoad', () => {
    it('returns capped value at 100', () => {
      expect(calculateCognitiveLoad(100)).toBe(100);
    });

    it('calculates load as stress * 0.7 + 30', () => {
      expect(calculateCognitiveLoad(50)).toBe(65);
    });

    it('returns 30 when stress is 0', () => {
      expect(calculateCognitiveLoad(0)).toBe(30);
    });
  });

  // ---- StressHysteresisManager --------------------------------------------
  describe('StressHysteresisManager', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('enters stress mode after sustained high stress', () => {
      const manager = new StressHysteresisManager();

      manager.check(80); // above STRESS_HIGH_THRESHOLD (70)
      vi.advanceTimersByTime(5000); // STRESS_HIGH_DURATION_MS
      const locked = manager.check(80);

      expect(locked).toBe(true);
    });

    it('exits stress mode after sustained low stress', () => {
      const manager = new StressHysteresisManager();

      // Enter stress mode first
      manager.check(80);
      vi.advanceTimersByTime(5000);
      manager.check(80); // triggers lock + sets lastUIMorphTime

      // Advance past 30s UI morph lockout
      vi.advanceTimersByTime(30000);

      // Now go low
      manager.check(40); // below STRESS_LOW_THRESHOLD (50) — starts low timer
      vi.advanceTimersByTime(10000); // STRESS_LOW_DURATION_MS
      const locked = manager.check(40);

      expect(locked).toBe(false);
    });

    it('respects UI morph lockout period', () => {
      const manager = new StressHysteresisManager();

      // Enter stress mode
      manager.check(80);
      vi.advanceTimersByTime(5000);
      manager.check(80); // triggers lock + sets lastUIMorphTime

      // Immediately try to exit — should be blocked by 30s lockout
      manager.check(30);
      vi.advanceTimersByTime(10000);
      const locked = manager.check(30);

      // Still locked because 10s < 30s lockout
      expect(locked).toBe(true);
    });

    it('resets all state', () => {
      const manager = new StressHysteresisManager();

      manager.check(80);
      vi.advanceTimersByTime(5000);
      manager.check(80);
      expect(manager.check(80)).toBe(true);

      manager.reset();
      // After reset, not locked
      expect(manager.check(60)).toBe(false);
    });

    it('resets timers when stress is in the middle zone', () => {
      const manager = new StressHysteresisManager();

      // Start accumulating high stress time
      manager.check(80);
      vi.advanceTimersByTime(3000);

      // Drop to middle zone — should reset timer
      manager.check(60);

      // Go high again — needs full 5s from scratch
      manager.check(80);
      vi.advanceTimersByTime(3000);
      expect(manager.check(80)).toBe(false); // only 3s, not 5s
    });
  });
});
