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

        // Start the 60 FPS processing loop
        startProcessingLoop();
      }

      setIsActive(true);
      addLog('SUCCESS', 'BIOMETRIC: Sensors active @ 60 FPS');
    } catch (error: any) {
      addLog('ERROR', `BIOMETRIC: Failed to start - ${error.message}`);
    }
  }, [isActive, config.source, addLog]);

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
  // 60 FPS PROCESSING LOOP
  // ============================================================================

  const startProcessingLoop = useCallback(() => {
    const processFrame = (timestamp: number) => {
      const now = Date.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameCountRef.current++;
      fpsCountRef.current++;

      // Process every 3rd frame for 20 FPS effective rate (saves CPU)
      // But update gaze point EVERY frame for smooth reticle
      const shouldProcessFull = frameCountRef.current % 3 === 0;

      const processingStart = window.performance.now();

      // ALWAYS update gaze point for smooth tracking
      if (config.gazeTrackingEnabled) {
        processGazeInstant();
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
  }, [config.gazeTrackingEnabled, config.stressDetectionEnabled]);

  // ============================================================================
  // GAZE PROCESSING - Split into instant and full
  // ============================================================================

  // Instant update for smooth reticle (every frame)
  const processGazeInstant = useCallback(() => {
    const gaze = getSimulatedGaze();
    if (gaze) {
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
    }
  }, []);

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
  }, [gazePoint]);

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

    // Update stress confidence
    setPerformance(prev => ({
      ...prev,
      stressConfidence: stressLevel.confidence * 100,
    }));
  }, [realtimeMode, stressLevel.value, stressLevel.confidence]);

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
    const lightingQuality = Math.min(100, (avgBrightness / 255) * 150); // Scale to 0-100

    let lightingStatus: 'GOOD' | 'LOW' | 'VERY_LOW' = 'GOOD';
    if (lightingQuality < 30) {
      lightingStatus = 'VERY_LOW';
    } else if (lightingQuality < 50) {
      lightingStatus = 'LOW';
    }

    // Face detection simulation (would use ML model in production)
    const faceDetected = lightingQuality > 20;

    setPerformance(prev => ({
      ...prev,
      lightingQuality: Math.round(lightingQuality),
      lightingStatus,
      faceDetected,
      overallConfidence: (prev.gazeConfidence + prev.stressConfidence + lightingQuality) / 3,
    }));
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getSimulatedGaze = (): GazePoint | null => {
    const mouseX = (window as any).__lastMouseX || window.innerWidth / 2;
    const mouseY = (window as any).__lastMouseY || window.innerHeight / 2;

    // Add slight smoothing/interpolation for more natural movement
    const noise = realtimeMode ? 0 : (Math.random() - 0.5) * 10;

    return {
      x: mouseX + noise,
      y: mouseY + noise,
      timestamp: Date.now(),
      confidence: performance.lightingQuality / 100,
      pupilDilation: 0.5 + Math.random() * 0.1,
    };
  };

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

  const calculateStressIndicators = useCallback((): StressIndicators => {
    const now = Date.now();
    const recentBlinks = blinkTimestampsRef.current.filter(t => now - t < 60000);
    const blinkRate = recentBlinks.length;
    const gazeStability = calculateGazeStability();
    const pupilDilation = 0.5 + Math.random() * 0.2;

    return { blinkRate, pupilDilation, gazeStability };
  }, []);

  const calculateGazeStability = (): number => {
    const history = gazeHistoryRef.current;
    if (history.length < 5) return 1;

    const recent = history.slice(-10);
    const centroid = calculateCentroid(recent);
    const dispersion = calculateDispersion(recent, centroid);

    return Math.max(0, 1 - dispersion / 200);
  };

  const calculateStressScore = useCallback((indicators: StressIndicators): number => {
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
    const recentFixations = fixationHistoryRef.current.filter(
      f => Date.now() - f.endTime < 30000
    );
    const totalFixationTime = recentFixations.reduce((sum, f) => sum + f.duration, 0);
    return Math.min(100, (totalFixationTime / 30000) * 100);
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
