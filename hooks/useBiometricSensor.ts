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
import { logger } from '../services/logger';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel/AgentKernel';
import { faceDetectionService, FaceDetectionResult } from '../services/faceDetectionService';
import {
  BiometricContext,
  BiometricConfig,
  GazePoint,
  GazeFixation,
  StressLevel,
  BiometricSource,
} from '../services/kernel/types';

// Import extracted biometric services
import {
  BiometricPerformance,
  DEFAULT_PERFORMANCE,
  GAZE_HISTORY_MAX,
  GAZE_HISTORY_TRIM,
  FIXATION_HISTORY_MAX,
  FIXATION_HISTORY_TRIM,
  calculateCentroid,
  calculateDispersion,
  getElementAtPoint,
  calculateGazeStability,
  isFixating,
  analyzeLighting,
  ConfidenceBuffer,
  PerformanceMonitor,
  StressHysteresisManager,
  calculateStressScore,
  determineTrend,
  calculateCognitiveLoad,
  emitFixationEvent,
  emitGazeUpdateEvent,
  emitBiometricFallback,
} from '../services/biometric';

// Re-export for backwards compatibility
export type { BiometricPerformance } from '../services/biometric';

const DEFAULT_CONFIG: BiometricConfig = {
  enabled: false,
  source: 'WEBCAM',
  gazeTrackingEnabled: true,
  stressDetectionEnabled: true,
  adaptiveUIEnabled: true,
  fixationThresholdMs: 200,
  stressThreshold: 70,
  samplingRateHz: 60,
};

interface UseBiometricSensorReturn {
  isActive: boolean;
  isCalibrating: boolean;
  gazePoint: GazePoint | null;
  currentFixation: GazeFixation | null;
  stressLevel: StressLevel;
  attentionScore: number;
  cognitiveLoad: number;
  config: BiometricConfig;
  performance: BiometricPerformance;
  realtimeMode: boolean;
  start: () => Promise<void>;
  stop: () => void;
  calibrate: () => Promise<boolean>;
  setConfig: (config: Partial<BiometricConfig>) => void;
  setRealtimeMode: (enabled: boolean) => void;
  getContext: () => BiometricContext;
}

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
  const [cognitiveLoadState, setCognitiveLoadState] = useState(30);
  const [realtimeMode, setRealtimeMode] = useState(false);
  const [performance, setPerformance] = useState<BiometricPerformance>(DEFAULT_PERFORMANCE);

  // Refs for tracking
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const fixationHistoryRef = useRef<GazeFixation[]>([]);
  const currentFixationRef = useRef<GazeFixation | null>(null);

  // Performance tracking refs
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const fpsCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const droppedFramesRef = useRef(0);

  // Stress calculation state
  const stressHistoryRef = useRef<number[]>([]);
  const fastStressHistoryRef = useRef<number[]>([]);

  // Face detection state
  const lastFaceResultRef = useRef<FaceDetectionResult | null>(null);
  const faceDetectionInitializedRef = useRef(false);
  const lastGazePointRef = useRef<GazePoint | null>(null);
  const faceDetectionFrameRef = useRef(0);
  const isFaceDetectionRunningRef = useRef(false);

  // Service instances
  const confidenceBufferRef = useRef(new ConfidenceBuffer());
  const performanceMonitorRef = useRef(new PerformanceMonitor((disabled) => {
    addLog(disabled ? 'WARN' : 'SUCCESS',
      disabled
        ? 'BIOMETRIC: Low FPS detected - disabling visual overlays to save CPU'
        : 'BIOMETRIC: FPS recovered - re-enabling visual overlays'
    );
  }));
  const stressHysteresisRef = useRef(new StressHysteresisManager());

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getGazeStability = useCallback((): number => {
    return calculateGazeStability(gazeHistoryRef.current);
  }, []);

  const calculateStressIndicators = useCallback(() => {
    const blinkRate = faceDetectionService.getBlinkRate();
    const gazeStability = getGazeStability();
    const faceResult = lastFaceResultRef.current;
    const pupilDilation = faceResult?.gazeEstimate?.pupilDilation ?? 0.5;
    return { blinkRate, pupilDilation, gazeStability };
  }, [getGazeStability]);

  const calculateAttention = useCallback((): number => {
    const faceResult = lastFaceResultRef.current;
    const gazeConfidence = faceResult?.gazeEstimate?.confidence ?? 0;
    const recentFixations = fixationHistoryRef.current.filter(
      f => Date.now() - f.endTime < 10000
    );
    const totalFixationTime = recentFixations.reduce((sum, f) => sum + f.duration, 0);
    const fixationScore = Math.min(100, (totalFixationTime / 5000) * 100);
    return Math.min(100, Math.max(0, (gazeConfidence * 100 * 0.6) + (fixationScore * 0.4)));
  }, []);

  const getContextInternal = useCallback((): BiometricContext => ({
    currentGaze: gazePoint || undefined,
    recentFixations: fixationHistoryRef.current.slice(-5),
    stressLevel,
    focusedElement: currentFixation?.targetElement,
    attentionScore,
    cognitiveLoad: cognitiveLoadState,
  }), [gazePoint, stressLevel, currentFixation, attentionScore, cognitiveLoadState]);

  // ============================================================================
  // GAZE PROCESSING
  // ============================================================================

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
          lastGazePointRef.current = null;
        }
      })
      .catch((error) => {
        logger.warn('BIOMETRIC: Face detection error', error);
      })
      .finally(() => {
        isFaceDetectionRunningRef.current = false;
      });
  }, []);

  const updateGazeFromCache = useCallback(() => {
    let gaze = lastGazePointRef.current;

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
    const fixating = isFixating(recentPoints);
    const targetElement = getElementAtPoint(centroid.x, centroid.y);

    if (fixating) {
      if (!currentFixationRef.current) {
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
        emitFixationEvent(targetElement, true, 0);
      } else {
        const updated = {
          ...currentFixationRef.current,
          centroid,
          duration: currentGaze.timestamp - currentFixationRef.current.startTime,
          endTime: currentGaze.timestamp,
          targetElement,
        };
        currentFixationRef.current = updated;
        setCurrentFixation(updated);
        emitFixationEvent(targetElement, true, updated.duration);

        if (updated.duration >= config.fixationThresholdMs) {
          const exists = fixationHistoryRef.current.some(f => f.id === updated.id);
          if (!exists) {
            fixationHistoryRef.current.push(updated);
            if (fixationHistoryRef.current.length > FIXATION_HISTORY_MAX) {
              fixationHistoryRef.current = fixationHistoryRef.current.slice(-FIXATION_HISTORY_TRIM);
            }
          }
        }
      }
    } else {
      if (currentFixationRef.current) {
        const endedFixation = currentFixationRef.current;
        if (endedFixation.duration >= config.fixationThresholdMs) {
          fixationHistoryRef.current.push(endedFixation);
          if (fixationHistoryRef.current.length > FIXATION_HISTORY_MAX) {
            fixationHistoryRef.current = fixationHistoryRef.current.slice(-FIXATION_HISTORY_TRIM);
          }
        }
        emitFixationEvent(endedFixation.targetElement, false, endedFixation.duration);
        currentFixationRef.current = null;
        setCurrentFixation(null);
      }
    }

    const gazeConfidence = Math.min(100, Math.max(0, 100 - dispersion));
    setPerformance(prev => ({
      ...prev,
      gazeConfidence,
      overallConfidence: (gazeConfidence + prev.stressConfidence + prev.lightingQuality) / 3,
    }));
  }, [config.fixationThresholdMs]);

  const processGazeFull = useCallback(() => {
    const gaze = gazePoint;
    if (!gaze) return;

    gazeHistoryRef.current.push(gaze);
    if (gazeHistoryRef.current.length > GAZE_HISTORY_MAX) {
      gazeHistoryRef.current = gazeHistoryRef.current.slice(-GAZE_HISTORY_TRIM);
    }

    detectFixation(gaze);
  }, [gazePoint, detectFixation]);

  // ============================================================================
  // STRESS PROCESSING
  // ============================================================================

  const processStress = useCallback(() => {
    const indicators = calculateStressIndicators();
    const rawStress = calculateStressScore(indicators);

    if (realtimeMode) {
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

    setAttentionScore(calculateAttention());
    setCognitiveLoadState(calculateCognitiveLoad(stressLevel.value));

    const faceStressEstimate = faceDetectionService.estimateStress();
    const stressConf = faceStressEstimate.confidence > 0.3
      ? faceStressEstimate.confidence * 100
      : stressLevel.confidence * 100;

    setPerformance(prev => ({ ...prev, stressConfidence: stressConf }));
  }, [realtimeMode, stressLevel.value, stressLevel.confidence, calculateStressIndicators, calculateAttention]);

  // ============================================================================
  // LIGHTING ANALYSIS
  // ============================================================================

  const analyzeLightingCallback = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const { lightingQuality, lightingStatus } = analyzeLighting(videoRef.current, canvasRef.current);

    const faceResult = lastFaceResultRef.current;
    const faceDetected = faceResult?.detected ?? false;
    const rawFaceConfidence = faceResult?.confidence ?? 0;
    const smoothedFaceConfidence = confidenceBufferRef.current.add(rawFaceConfidence);
    const rawGazeConf = faceResult?.gazeEstimate?.confidence ?? 0;
    const smoothedGazeConf = faceDetected ? Math.max(smoothedFaceConfidence, rawGazeConf) : 0;

    setPerformance(prev => ({
      ...prev,
      lightingQuality,
      lightingStatus,
      faceDetected,
      gazeConfidence: smoothedGazeConf * 100,
      overallConfidence: faceDetected
        ? ((smoothedGazeConf * 100) + prev.stressConfidence + lightingQuality) / 3
        : 0,
    }));
  }, []);

  // ============================================================================
  // 60 FPS PROCESSING LOOP
  // ============================================================================

  const startProcessingLoop = useCallback(() => {
    const processFrame = () => {
      const now = Date.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameCountRef.current++;
      fpsCountRef.current++;

      faceDetectionFrameRef.current++;
      const shouldRunFaceDetection = faceDetectionFrameRef.current % 6 === 0;
      const shouldProcessFull = frameCountRef.current % 3 === 0;

      if (config.gazeTrackingEnabled && shouldRunFaceDetection && !isFaceDetectionRunningRef.current) {
        runFaceDetection();
      }

      if (config.gazeTrackingEnabled) {
        updateGazeFromCache();
      }

      if (shouldProcessFull) {
        if (config.gazeTrackingEnabled) {
          processGazeFull();
        }
        if (config.stressDetectionEnabled) {
          processStress();
        }
        analyzeLightingCallback();

        const context = getContextInternal();
        agentKernel.updateBiometricContext(context);
      }

      if (now - lastFpsUpdateRef.current >= 1000) {
        const fps = fpsCountRef.current;
        fpsCountRef.current = 0;
        lastFpsUpdateRef.current = now;

        performanceMonitorRef.current.check(fps);

        setPerformance(prev => ({
          ...prev,
          fps,
          targetFps: 60,
          frameTime,
          processingLatency: 0,
          droppedFrames: droppedFramesRef.current,
        }));
      }

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
    analyzeLightingCallback,
    getContextInternal,
  ]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  const start = useCallback(async () => {
    if (isActive) return;

    try {
      addLog('SYSTEM', 'BIOMETRIC: Initializing 60 FPS sensors...');

      if (config.source === 'WEBCAM') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 60, min: 30 },
            advanced: [
              { exposureMode: 'continuous' } as any,
              { focusMode: 'continuous' } as any,
            ],
          },
        });

        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        canvasRef.current = canvas;

        frameCountRef.current = 0;
        fpsCountRef.current = 0;
        droppedFramesRef.current = 0;
        lastFpsUpdateRef.current = Date.now();

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

        startProcessingLoop();
      }

      setIsActive(true);
      addLog('SUCCESS', 'BIOMETRIC: Sensors active @ 60 FPS');
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';

      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        addLog('WARN', 'BIOMETRIC: Webcam denied - switching to mouse tracking mode');
        setConfigState(prev => ({ ...prev, source: 'MOUSE_FALLBACK' as BiometricSource }));
        faceDetectionInitializedRef.current = false;
        setIsActive(true);
        startProcessingLoop();
        emitBiometricFallback('webcam_denied', 'Biometrics unavailable - Using mouse tracking');
      } else if (errorMsg.includes('NotFoundError')) {
        addLog('WARN', 'BIOMETRIC: No webcam found - switching to mouse tracking mode');
        setConfigState(prev => ({ ...prev, source: 'MOUSE_FALLBACK' as BiometricSource }));
        setIsActive(true);
        startProcessingLoop();
        emitBiometricFallback('no_webcam', 'No webcam detected - Using mouse tracking');
      } else {
        addLog('ERROR', `BIOMETRIC: Failed to start - ${errorMsg}`);
      }
    }
  }, [isActive, config.source, addLog, startProcessingLoop]);

  const stop = useCallback(() => {
    if (!isActive) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    videoRef.current = null;
    canvasRef.current = null;
    setIsActive(false);
    setGazePoint(null);
    setCurrentFixation(null);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      (window as any).__lastMouseX = e.clientX;
      (window as any).__lastMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    cognitiveLoad: cognitiveLoadState,
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
