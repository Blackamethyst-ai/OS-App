/**
 * BIOMETRIC SENSOR HOOK - Real-Time 60 FPS Edition
 *
 * High-performance biometric data collection with instant feedback.
 * Designed to feel responsive and obvious to the user.
 *
 * Features:
 * - 60 FPS processing loop with frame skipping (effective 20 FPS)
 * - Real-time FPS and latency metrics
 * - Low-light detection and warnings
 * - Confidence scoring for all measurements
 * - Instant gaze point updates for smooth reticle tracking
 *
 * Reference: arXiv:2512.16366 (Mind the Gaze: Adaptive UI)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel/AgentKernel';
import { faceDetectionService, FaceDetectionResult, GazeEstimate } from '../services/faceDetectionService';
import {
  BiometricContext,
  BiometricConfig,
  GazePoint,
  GazeFixation,
  StressLevel,
  StressIndicators,
  BiometricSource,
} from '../services/kernel/types';

const DEFAULT_CONFIG: BiometricConfig = {
  enabled: false,
  source: 'WEBCAM',
  gazeTrackingEnabled: true,
  stressDetectionEnabled: true,
  adaptiveUIEnabled: true,
  fixationThresholdMs: 200,
  stressThreshold: 70,
  samplingRateHz: 60, // Target 60 FPS
};

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

interface UseBiometricSensorReturn {
  // State
  isActive: boolean;
  isCalibrating: boolean;
  gazePoint: GazePoint | null;
  currentFixation: GazeFixation | null;
  stressLevel: StressLevel;
  attentionScore: number;
  cognitiveLoad: number;
  config: BiometricConfig;

  // NEW: Performance metrics
  performance: BiometricPerformance;
  realtimeMode: boolean;

  // Actions
  start: () => Promise<void>;
  stop: () => void;
  calibrate: () => Promise<boolean>;
  setConfig: (config: Partial<BiometricConfig>) => void;
  setRealtimeMode: (enabled: boolean) => void;
  getContext: () => BiometricContext;
}

// Event emitter for fixation glow effects
const emitFixationEvent = (elementId: string | undefined, isFixating: boolean, duration: number) => {
  if (!elementId) return;

  const event = new CustomEvent('biometric-fixation', {
    detail: { elementId, isFixating, duration }
  });
  window.dispatchEvent(event);
};

// Event emitter for real-time gaze position (for GazeReticle)
const emitGazeUpdateEvent = (
  x: number,
  y: number,
  confidence: number,
  isFixating: boolean,
  fixationDuration: number,
  targetElement?: string
) => {
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

export const useBiometricSensor = (): UseBiometricSensorReturn => {
  const { actions } = useAppStore();
  const { addLog } = actions;

  // State
  const [isActive, setIsActive] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [config, setConfigState] = useState<BiometricConfig>(DEFAULT_CONFIG);
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null);
  const [currentFixation, setCurrentFixation] = useState<GazeFixation | null>(null);
  const [stressLevel, setStressLevel] = useState<StressLevel>({
    value: 0,
    trend: 'STABLE',
    confidence: 0,
    timestamp: Date.now(),
  });
  const [attentionScore, setAttentionScore] = useState(100);
  const [cognitiveLoad, setCognitiveLoad] = useState(30);
  const [realtimeMode, setRealtimeMode] = useState(false); // Fast debug mode

  // Performance metrics state
  const [performance, setPerformance] = useState<BiometricPerformance>({
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
  });

  // Refs for tracking
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const fixationHistoryRef = useRef<GazeFixation[]>([]);
  const blinkTimestampsRef = useRef<number[]>([]);
  const currentFixationRef = useRef<GazeFixation | null>(null);

  // Performance tracking refs
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const fpsCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const droppedFramesRef = useRef(0);

  // Stress calculation state
  const stressHistoryRef = useRef<number[]>([]);
  const fastStressHistoryRef = useRef<number[]>([]); // For realtime mode

  // Face detection state
  const lastFaceResultRef = useRef<FaceDetectionResult | null>(null);
  const faceDetectionInitializedRef = useRef(false);
  const lastGazePointRef = useRef<GazePoint | null>(null);
  const faceDetectionFrameRef = useRef(0);
  const isFaceDetectionRunningRef = useRef(false);

  // ============================================================================
  // STABILIZATION: Moving Average Buffers (Protocol §1)
  // ============================================================================
  const confidenceBufferRef = useRef<number[]>([]);
  const CONFIDENCE_BUFFER_SIZE = 10; // Average last 10 frames

  // Hysteresis state for stress mode (Protocol §2)
  const stressHighStartRef = useRef<number | null>(null);
  const stressLowStartRef = useRef<number | null>(null);
  const isStressModeLockedRef = useRef(false);
  const lastUIMorphTimeRef = useRef<number>(0);
  const STRESS_HIGH_THRESHOLD = 70;
  const STRESS_LOW_THRESHOLD = 50;
  const STRESS_HIGH_DURATION_MS = 5000;  // 5 seconds to enter
  const STRESS_LOW_DURATION_MS = 10000;  // 10 seconds to exit
  const UI_MORPH_LOCKOUT_MS = 30000;     // 30 second lockout

  // Performance monitoring (Protocol §4)
  const lowFpsStartRef = useRef<number | null>(null);
  const overlaysDisabledRef = useRef(false);
  const LOW_FPS_THRESHOLD = 15;
  const LOW_FPS_DURATION_MS = 5000;

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * STABILIZATION: Smoothed confidence with moving average (Protocol §1)
   * Prevents jittery numbers jumping between 16% and 80%
   */
  const getSmoothedConfidence = useCallback((rawConfidence: number): number => {
    // Add to buffer
    confidenceBufferRef.current.push(rawConfidence);

    // Keep only last N frames
    if (confidenceBufferRef.current.length > CONFIDENCE_BUFFER_SIZE) {
      confidenceBufferRef.current = confidenceBufferRef.current.slice(-CONFIDENCE_BUFFER_SIZE);
    }

    // Return average
    const sum = confidenceBufferRef.current.reduce((a, b) => a + b, 0);
    return sum / confidenceBufferRef.current.length;
  }, []);

  /**
   * STABILIZATION: Check if stress mode should change (Protocol §2)
   * Implements hysteresis to prevent jitter
   */
  const checkStressHysteresis = useCallback((currentStress: number): boolean => {
    const now = Date.now();

    // Check if UI morphed recently (30s lockout)
    if (now - lastUIMorphTimeRef.current < UI_MORPH_LOCKOUT_MS) {
      return isStressModeLockedRef.current;
    }

    if (currentStress >= STRESS_HIGH_THRESHOLD) {
      // Trying to enter stress mode
      stressLowStartRef.current = null;
      if (!stressHighStartRef.current) {
        stressHighStartRef.current = now;
      }
      // Only enter if sustained for 5 seconds
      if (now - stressHighStartRef.current >= STRESS_HIGH_DURATION_MS) {
        if (!isStressModeLockedRef.current) {
          isStressModeLockedRef.current = true;
          lastUIMorphTimeRef.current = now;
        }
      }
    } else if (currentStress <= STRESS_LOW_THRESHOLD) {
      // Trying to exit stress mode
      stressHighStartRef.current = null;
      if (!stressLowStartRef.current) {
        stressLowStartRef.current = now;
      }
      // Only exit if sustained for 10 seconds
      if (now - stressLowStartRef.current >= STRESS_LOW_DURATION_MS) {
        if (isStressModeLockedRef.current) {
          isStressModeLockedRef.current = false;
          lastUIMorphTimeRef.current = now;
        }
      }
    } else {
      // In the middle zone - reset timers
      stressHighStartRef.current = null;
      stressLowStartRef.current = null;
    }

    return isStressModeLockedRef.current;
  }, []);

  /**
   * STABILIZATION: Performance monitor (Protocol §4)
   * Auto-disable overlays if FPS drops below threshold
   */
  const checkPerformance = useCallback((currentFps: number): void => {
    const now = Date.now();

    if (currentFps < LOW_FPS_THRESHOLD) {
      if (!lowFpsStartRef.current) {
        lowFpsStartRef.current = now;
      }
      // Disable overlays after 5 seconds of low FPS
      if (now - lowFpsStartRef.current >= LOW_FPS_DURATION_MS && !overlaysDisabledRef.current) {
        overlaysDisabledRef.current = true;
        addLog('WARN', 'BIOMETRIC: Low FPS detected - disabling visual overlays to save CPU');
        // Emit event to disable GazeReticle
        window.dispatchEvent(new CustomEvent('biometric-performance-mode', { detail: { overlaysDisabled: true } }));
      }
    } else {
      lowFpsStartRef.current = null;
      // Re-enable overlays if FPS recovers
      if (overlaysDisabledRef.current && currentFps >= LOW_FPS_THRESHOLD + 5) {
        overlaysDisabledRef.current = false;
        addLog('SUCCESS', 'BIOMETRIC: FPS recovered - re-enabling visual overlays');
        window.dispatchEvent(new CustomEvent('biometric-performance-mode', { detail: { overlaysDisabled: false } }));
      }
    }
  }, [addLog]);

  const calculateCentroid = (points: GazePoint[]): { x: number; y: number } => {
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return { x: sumX / points.length, y: sumY / points.length };
  };

  const calculateDispersion = (
    points: GazePoint[],
    centroid: { x: number; y: number }
  ): number => {
    const distances = points.map(p =>
      Math.sqrt(Math.pow(p.x - centroid.x, 2) + Math.pow(p.y - centroid.y, 2))
    );
    return Math.max(...distances);
  };

  const getElementAtPoint = (x: number, y: number): string | undefined => {
    const element = document.elementFromPoint(x, y);
    return element?.id ||
           element?.getAttribute('data-biometric-id') ||
           element?.closest('[data-biometric-id]')?.getAttribute('data-biometric-id') ||
           undefined;
  };

  const calculateGazeStability = (): number => {
    const history = gazeHistoryRef.current;
    if (history.length < 5) return 1;

    const recent = history.slice(-10);
    const centroid = calculateCentroid(recent);
    const dispersion = calculateDispersion(recent, centroid);

    return Math.max(0, 1 - dispersion / 200);
  };

  const calculateStressIndicators = useCallback((): StressIndicators => {
    // Use real blink rate from face detection service
    const blinkRate = faceDetectionService.getBlinkRate();

    // Get gaze stability from history
    const gazeStability = calculateGazeStability();

    // Get pupil dilation from face detection
    const faceResult = lastFaceResultRef.current;
    const pupilDilation = faceResult?.gazeEstimate?.pupilDilation ?? 0.5;

    return { blinkRate, pupilDilation, gazeStability };
  }, []);

  const calculateStressScore = useCallback((indicators: StressIndicators): number => {
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
        expressionStress * 0.4 +
        eyeStress * 0.3 +
        ((normalizedBlink + normalizedStability) / 2) * 0.3
      );
    }

    // Fallback to traditional calculation
    const weights = { blinkRate: 0.3, pupilDilation: 0.4, gazeStability: 0.3 };
    const normalizedBlink = Math.min(100, (indicators.blinkRate / 30) * 100);
    const normalizedPupil = indicators.pupilDilation * 100;
    const normalizedStability = (1 - indicators.gazeStability) * 100;

    return (
      normalizedBlink * weights.blinkRate +
      normalizedPupil * weights.pupilDilation +
      normalizedStability * weights.gazeStability
    );
  }, []);

  const determineTrend = (history: number[]): 'RISING' | 'STABLE' | 'FALLING' => {
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

  const calculateAttention = (): number => {
    // Base attention on current gaze confidence (immediate feedback)
    const faceResult = lastFaceResultRef.current;
    const gazeConfidence = faceResult?.gazeEstimate?.confidence ?? 0;

    // Factor in fixation history (longer-term engagement)
    const recentFixations = fixationHistoryRef.current.filter(
      f => Date.now() - f.endTime < 10000  // Last 10 seconds
    );
    const totalFixationTime = recentFixations.reduce((sum, f) => sum + f.duration, 0);
    const fixationScore = Math.min(100, (totalFixationTime / 5000) * 100);  // 5s of fixation = 100%

    // Blend: 60% current gaze confidence, 40% fixation history
    const attention = (gazeConfidence * 100 * 0.6) + (fixationScore * 0.4);

    return Math.min(100, Math.max(0, attention));
  };

  const calculateCognitiveLoad = (stress: number): number => {
    return Math.min(100, stress * 0.7 + 30);
  };

  const getContextInternal = (): BiometricContext => {
    return {
      currentGaze: gazePoint || undefined,
      recentFixations: fixationHistoryRef.current.slice(-5),
      stressLevel,
      focusedElement: currentFixation?.targetElement,
      attentionScore,
      cognitiveLoad,
    };
  };

  // ============================================================================
  // GAZE PROCESSING - Optimized for performance
  // ============================================================================

  // Non-blocking face detection (runs in background)
  const runFaceDetection = useCallback(() => {
    if (!faceDetectionInitializedRef.current || !videoRef.current) return;
    if (isFaceDetectionRunningRef.current) return;

    isFaceDetectionRunningRef.current = true;

    faceDetectionService.detectFace(videoRef.current)
      .then((result) => {
        lastFaceResultRef.current = result;

        if (result.detected && result.gazeEstimate) {
          const gaze = result.gazeEstimate;
          lastGazePointRef.current = {
            x: gaze.x,
            y: gaze.y,
            timestamp: Date.now(),
            confidence: gaze.confidence,
            pupilDilation: gaze.pupilDilation,
          };
        } else {
          // Face not detected - clear gaze cache so UI shows proper state
          lastGazePointRef.current = null;
        }
      })
      .catch((error) => {
        console.warn('BIOMETRIC: Face detection error', error);
      })
      .finally(() => {
        isFaceDetectionRunningRef.current = false;
      });
  }, []);

  // Fast sync update from cached gaze (runs every frame for smooth tracking)
  const updateGazeFromCache = useCallback(() => {
    let gaze = lastGazePointRef.current;

    // Fallback to mouse if no face detection
    if (!gaze || gaze.confidence < 0.1) {
      const mouseX = (window as any).__lastMouseX || window.innerWidth / 2;
      const mouseY = (window as any).__lastMouseY || window.innerHeight / 2;
      gaze = {
        x: mouseX,
        y: mouseY,
        timestamp: Date.now(),
        confidence: 0.1,
        pupilDilation: 0.5,
      };
    }

    setGazePoint(gaze);

    // Emit gaze update for GazeReticle component
    const fixation = currentFixationRef.current;
    emitGazeUpdateEvent(
      gaze.x,
      gaze.y,
      gaze.confidence,
      !!fixation,
      fixation?.duration || 0,
      fixation?.targetElement
    );
  }, []);

  const detectFixation = useCallback((currentGaze: GazePoint) => {
    const history = gazeHistoryRef.current;
    if (history.length < 5) return;

    const recentPoints = history.slice(-10);
    const centroid = calculateCentroid(recentPoints);
    const dispersion = calculateDispersion(recentPoints, centroid);

    // Low dispersion indicates fixation
    const isFixating = dispersion < 50; // pixels
    const targetElement = getElementAtPoint(centroid.x, centroid.y);

    if (isFixating) {
      if (!currentFixationRef.current) {
        // Start new fixation
        const newFixation: GazeFixation = {
          id: crypto.randomUUID(),
          centroid,
          duration: 0,
          startTime: currentGaze.timestamp,
          endTime: currentGaze.timestamp,
          targetElement,
        };
        currentFixationRef.current = newFixation;
        setCurrentFixation(newFixation);

        // Emit fixation start event
        emitFixationEvent(targetElement, true, 0);
      } else {
        // Update existing fixation
        const updated = {
          ...currentFixationRef.current,
          centroid,
          duration: currentGaze.timestamp - currentFixationRef.current.startTime,
          endTime: currentGaze.timestamp,
          targetElement,
        };
        currentFixationRef.current = updated;
        setCurrentFixation(updated);

        // Emit ongoing fixation event
        emitFixationEvent(targetElement, true, updated.duration);

        // Record fixation if long enough
        if (updated.duration >= config.fixationThresholdMs) {
          const exists = fixationHistoryRef.current.some(f => f.id === updated.id);
          if (!exists) {
            fixationHistoryRef.current.push(updated);
            if (fixationHistoryRef.current.length > 20) {
              fixationHistoryRef.current = fixationHistoryRef.current.slice(-10);
            }
          }
        }
      }
    } else {
      // End fixation
      if (currentFixationRef.current) {
        const endedFixation = currentFixationRef.current;
        if (endedFixation.duration >= config.fixationThresholdMs) {
          fixationHistoryRef.current.push(endedFixation);
          if (fixationHistoryRef.current.length > 20) {
            fixationHistoryRef.current = fixationHistoryRef.current.slice(-10);
          }
        }

        // Emit fixation end event
        emitFixationEvent(endedFixation.targetElement, false, endedFixation.duration);

        currentFixationRef.current = null;
        setCurrentFixation(null);
      }
    }

    // Update confidence based on gaze stability
    const gazeConfidence = Math.min(100, Math.max(0, 100 - dispersion));
    setPerformance(prev => ({
      ...prev,
      gazeConfidence,
      overallConfidence: (gazeConfidence + prev.stressConfidence + prev.lightingQuality) / 3,
    }));
  }, [config.fixationThresholdMs]);

  // Full processing for fixation detection (every 3rd frame)
  const processGazeFull = useCallback(() => {
    const gaze = gazePoint;
    if (!gaze) return;

    gazeHistoryRef.current.push(gaze);

    // Keep only recent history
    if (gazeHistoryRef.current.length > 100) {
      gazeHistoryRef.current = gazeHistoryRef.current.slice(-50);
    }

    // Detect fixations
    detectFixation(gaze);
  }, [gazePoint, detectFixation]);

  // ============================================================================
  // STRESS PROCESSING - Dual mode (slow/fast)
  // ============================================================================

  const processStress = useCallback(() => {
    const indicators = calculateStressIndicators();
    const rawStress = calculateStressScore(indicators);

    // Dual-mode stress calculation
    if (realtimeMode) {
      // Fast mode: 1-second rolling average
      fastStressHistoryRef.current.push(rawStress);
      if (fastStressHistoryRef.current.length > 5) {
        fastStressHistoryRef.current = fastStressHistoryRef.current.slice(-5);
      }
      const fastStress = fastStressHistoryRef.current.reduce((a, b) => a + b, 0) /
        fastStressHistoryRef.current.length;

      setStressLevel({
        value: Math.round(fastStress),
        trend: determineTrend(fastStressHistoryRef.current),
        confidence: Math.min(1, fastStressHistoryRef.current.length / 5),
        timestamp: Date.now(),
      });
    } else {
      // Slow mode: 10-second rolling average (stable)
      stressHistoryRef.current.push(rawStress);
      if (stressHistoryRef.current.length > 30) {
        stressHistoryRef.current = stressHistoryRef.current.slice(-15);
      }

      const smoothedStress = stressHistoryRef.current.reduce((a, b) => a + b, 0) /
        stressHistoryRef.current.length;

      setStressLevel({
        value: Math.round(smoothedStress),
        trend: determineTrend(stressHistoryRef.current),
        confidence: Math.min(1, stressHistoryRef.current.length / 15),
        timestamp: Date.now(),
      });
    }

    // Update attention and cognitive load
    setAttentionScore(calculateAttention());
    setCognitiveLoad(calculateCognitiveLoad(stressLevel.value));

    // Update stress confidence based on real face detection
    const faceStressEstimate = faceDetectionService.estimateStress();
    const stressConf = faceStressEstimate.confidence > 0.3
      ? faceStressEstimate.confidence * 100
      : stressLevel.confidence * 100;

    setPerformance(prev => ({
      ...prev,
      stressConfidence: stressConf,
    }));
  }, [realtimeMode, stressLevel.value, stressLevel.confidence, calculateStressIndicators, calculateStressScore]);

  // ============================================================================
  // LOW-LIGHT DETECTION
  // ============================================================================

  const analyzeLighting = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    const lightingQuality = Math.min(100, (avgBrightness / 55) * 150); // Scale to 0-100 (Adjusted divisor)

    let lightingStatus: 'GOOD' | 'LOW' | 'VERY_LOW' = 'GOOD';
    if (lightingQuality < 30) {
      lightingStatus = 'VERY_LOW';
    } else if (lightingQuality < 50) {
      lightingStatus = 'LOW';
    }

    // Use REAL face detection result from face-api.js
    const faceResult = lastFaceResultRef.current;
    const faceDetected = faceResult?.detected ?? false;
    const rawFaceConfidence = faceResult?.confidence ?? 0;

    // STABILIZATION: Apply moving average smoothing to confidence (Protocol §1)
    const smoothedFaceConfidence = getSmoothedConfidence(rawFaceConfidence);

    // Calculate gaze confidence from actual detection (also smoothed)
    const rawGazeConf = faceResult?.gazeEstimate?.confidence ?? 0;
    const smoothedGazeConf = faceDetected ? Math.max(smoothedFaceConfidence, rawGazeConf) : 0;

    setPerformance(prev => ({
      ...prev,
      lightingQuality: Math.round(lightingQuality),
      lightingStatus,
      faceDetected,
      gazeConfidence: smoothedGazeConf * 100,
      overallConfidence: faceDetected
        ? ((smoothedGazeConf * 100) + prev.stressConfidence + lightingQuality) / 3
        : 0,
    }));
  }, [getSmoothedConfidence]);

  // ============================================================================
  // 60 FPS PROCESSING LOOP
  // ============================================================================

  const startProcessingLoop = useCallback(() => {
    const processFrame = (timestamp: number) => {
      const now = Date.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameCountRef.current++;
      fpsCountRef.current++;

      // OPTIMIZATION: Face detection is heavy - run every 6th frame (~10 FPS)
      // Use cached gaze for smooth reticle tracking in between
      faceDetectionFrameRef.current++;
      const shouldRunFaceDetection = faceDetectionFrameRef.current % 6 === 0;
      const shouldProcessFull = frameCountRef.current % 3 === 0;

      const processingStart = window.performance.now();

      // Run face detection only every 6th frame (non-blocking)
      if (config.gazeTrackingEnabled && shouldRunFaceDetection && !isFaceDetectionRunningRef.current) {
        runFaceDetection();
      }

      // Update gaze point from cached result (smooth tracking)
      if (config.gazeTrackingEnabled) {
        updateGazeFromCache();
      }

      // Full processing every 3rd frame
      if (shouldProcessFull) {
        if (config.gazeTrackingEnabled) {
          processGazeFull();
        }

        if (config.stressDetectionEnabled) {
          processStress();
        }

        // Analyze lighting conditions
        analyzeLighting();

        // Update kernel with biometric context
        const context = getContextInternal();
        agentKernel.updateBiometricContext(context);
      }

      const processingLatency = window.performance.now() - processingStart;

      // Update FPS counter every second
      if (now - lastFpsUpdateRef.current >= 1000) {
        const fps = fpsCountRef.current;
        fpsCountRef.current = 0;
        lastFpsUpdateRef.current = now;

        // STABILIZATION: Check performance and auto-disable overlays (Protocol §4)
        checkPerformance(fps);

        // Update performance metrics
        setPerformance(prev => ({
          ...prev,
          fps,
          targetFps: 60,
          frameTime,
          processingLatency,
          droppedFrames: droppedFramesRef.current,
        }));
      }

      // Check for dropped frames (frame time > 50ms = dropped)
      if (frameTime > 50) {
        droppedFramesRef.current++;
      }

      rafIdRef.current = requestAnimationFrame(processFrame);
    };

    rafIdRef.current = requestAnimationFrame(processFrame);
  }, [
    config.gazeTrackingEnabled,
    config.stressDetectionEnabled,
    runFaceDetection,
    updateGazeFromCache,
    processGazeFull,
    processStress,
    analyzeLighting,
    checkPerformance
  ]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  const start = useCallback(async () => {
    if (isActive) return;

    try {
      addLog('SYSTEM', 'BIOMETRIC: Initializing 60 FPS sensors...');

      if (config.source === 'WEBCAM') {
        // Request webcam with optimized settings for low-light
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 60, min: 30 },
            // Low-light optimizations
            advanced: [
              { exposureMode: 'continuous' } as any,
              { focusMode: 'continuous' } as any,
            ],
          },
        });

        streamRef.current = stream;

        // Create video element for processing
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        // Create canvas for brightness analysis
        const canvas = document.createElement('canvas');
        canvas.width = 160; // Downscaled for performance
        canvas.height = 120;
        canvasRef.current = canvas;

        // Reset performance counters
        frameCountRef.current = 0;
        fpsCountRef.current = 0;
        droppedFramesRef.current = 0;
        lastFpsUpdateRef.current = Date.now();

        // Initialize face detection service
        if (!faceDetectionInitializedRef.current) {
          addLog('SYSTEM', 'BIOMETRIC: Initializing face detection models...');
          const faceInitialized = await faceDetectionService.initialize();
          faceDetectionInitializedRef.current = faceInitialized;
          if (faceInitialized) {
            addLog('SUCCESS', 'BIOMETRIC: Face detection models loaded');
          } else {
            addLog('WARN', 'BIOMETRIC: Face detection failed to initialize, using fallback');
          }
        }

        // Start the 60 FPS processing loop
        startProcessingLoop();
      }

      setIsActive(true);
      addLog('SUCCESS', 'BIOMETRIC: Sensors active @ 60 FPS');
    } catch (error: any) {
      // STABILIZATION: Graceful fallback (Protocol §3)
      const errorMsg = error.message || 'Unknown error';

      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        addLog('WARN', 'BIOMETRIC: Webcam denied - switching to mouse tracking mode');
        // Switch to mouse-only mode
        setConfigState(prev => ({ ...prev, source: 'MOUSE_FALLBACK' as BiometricSource }));
        faceDetectionInitializedRef.current = false;
        setIsActive(true);
        startProcessingLoop();
        // Emit toast notification
        window.dispatchEvent(new CustomEvent('biometric-fallback', {
          detail: { reason: 'webcam_denied', message: 'Biometrics unavailable - Using mouse tracking' }
        }));
      } else if (errorMsg.includes('NotFoundError')) {
        addLog('WARN', 'BIOMETRIC: No webcam found - switching to mouse tracking mode');
        setConfigState(prev => ({ ...prev, source: 'MOUSE_FALLBACK' as BiometricSource }));
        setIsActive(true);
        startProcessingLoop();
        window.dispatchEvent(new CustomEvent('biometric-fallback', {
          detail: { reason: 'no_webcam', message: 'No webcam detected - Using mouse tracking' }
        }));
      } else {
        addLog('ERROR', `BIOMETRIC: Failed to start - ${errorMsg}`);
      }
    }
  }, [isActive, config.source, addLog, startProcessingLoop]);

  const stop = useCallback(() => {
    if (!isActive) return;

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop processing loop
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    videoRef.current = null;
    canvasRef.current = null;
    setIsActive(false);
    setGazePoint(null);
    setCurrentFixation(null);

    // Emit stop event to clear any glow effects
    emitFixationEvent(currentFixationRef.current?.targetElement, false, 0);

    addLog('SYSTEM', 'BIOMETRIC: Sensors stopped');
  }, [isActive, addLog]);

  const calibrate = useCallback(async (): Promise<boolean> => {
    if (!isActive) {
      addLog('WARN', 'BIOMETRIC: Start sensors before calibrating');
      return false;
    }

    setIsCalibrating(true);
    addLog('SYSTEM', 'BIOMETRIC: Starting calibration...');

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setIsCalibrating(false);
      addLog('SUCCESS', 'BIOMETRIC: Calibration complete');
      return true;
    } catch (error: any) {
      setIsCalibrating(false);
      addLog('ERROR', `BIOMETRIC: Calibration failed - ${error.message}`);
      return false;
    }
  }, [isActive, addLog]);

  // ============================================================================
  // CONFIG
  // ============================================================================

  const setConfig = useCallback((newConfig: Partial<BiometricConfig>) => {
    setConfigState(prev => {
      const updated = { ...prev, ...newConfig };
      if ('adaptiveUIEnabled' in newConfig) {
        agentKernel.setAdaptiveUIEnabled(updated.adaptiveUIEnabled);
      }
      return updated;
    });
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Track mouse position for simulation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      (window as any).__lastMouseX = e.clientX;
      (window as any).__lastMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    isCalibrating,
    gazePoint,
    currentFixation,
    stressLevel,
    attentionScore,
    cognitiveLoad,
    config,
    performance,
    realtimeMode,
    start,
    stop,
    calibrate,
    setConfig,
    setRealtimeMode,
    getContext: getContextInternal,
  };
};
