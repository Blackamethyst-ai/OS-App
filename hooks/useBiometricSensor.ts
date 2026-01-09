/**
 * BIOMETRIC SENSOR HOOK
 *
 * Main hook for biometric data collection and processing.
 * Integrates gaze tracking and stress detection for adaptive UI.
 *
 * Features:
 * - Webcam-based gaze tracking
 * - Stress level estimation from biometric signals
 * - Attention scoring
 * - Cognitive load estimation
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
  samplingRateHz: 30,
};

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

  // Actions
  start: () => Promise<void>;
  stop: () => void;
  calibrate: () => Promise<boolean>;
  setConfig: (config: Partial<BiometricConfig>) => void;
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
  const [cognitiveLoad, setCognitiveLoad] = useState(30);

  // Refs for tracking
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const fixationHistoryRef = useRef<GazeFixation[]>([]);
  const blinkTimestampsRef = useRef<number[]>([]);
  const lastGazeUpdateRef = useRef<number>(0);

  // Stress calculation state
  const stressHistoryRef = useRef<number[]>([]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  const start = useCallback(async () => {
    if (isActive) return;

    try {
      addLog('SYSTEM', 'BIOMETRIC: Initializing sensors...');

      if (config.source === 'WEBCAM') {
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        streamRef.current = stream;

        // Create video element for processing
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        videoRef.current = video;

        // Start processing loop
        startProcessingLoop();
      }

      setIsActive(true);
      addLog('SUCCESS', 'BIOMETRIC: Sensors active');
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    videoRef.current = null;
    setIsActive(false);
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
      // Simulate calibration process
      // In production, this would involve showing targets and collecting gaze data
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
  // PROCESSING LOOP
  // ============================================================================

  const startProcessingLoop = useCallback(() => {
    const processFrame = () => {
      const now = Date.now();
      const interval = 1000 / config.samplingRateHz;

      if (now - lastGazeUpdateRef.current >= interval) {
        lastGazeUpdateRef.current = now;

        if (config.gazeTrackingEnabled) {
          processGaze();
        }

        if (config.stressDetectionEnabled) {
          processStress();
        }

        // Update kernel with biometric context
        const context = getContextInternal();
        agentKernel.updateBiometricContext(context);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [config.samplingRateHz, config.gazeTrackingEnabled, config.stressDetectionEnabled]);

  // ============================================================================
  // GAZE PROCESSING
  // ============================================================================

  const processGaze = useCallback(() => {
    // In production, this would use a gaze tracking library like WebGazer.js
    // For now, simulate gaze data based on mouse position as a fallback
    const simulatedGaze = getSimulatedGaze();

    if (simulatedGaze) {
      setGazePoint(simulatedGaze);
      gazeHistoryRef.current.push(simulatedGaze);

      // Keep only recent history
      if (gazeHistoryRef.current.length > 100) {
        gazeHistoryRef.current = gazeHistoryRef.current.slice(-50);
      }

      // Detect fixations
      detectFixation(simulatedGaze);
    }
  }, []);

  const detectFixation = useCallback((currentGaze: GazePoint) => {
    const history = gazeHistoryRef.current;
    if (history.length < 5) return;

    const recentPoints = history.slice(-10);
    const centroid = calculateCentroid(recentPoints);
    const dispersion = calculateDispersion(recentPoints, centroid);

    // Low dispersion indicates fixation
    const isFixating = dispersion < 50; // pixels

    if (isFixating) {
      if (!currentFixation) {
        // Start new fixation
        const newFixation: GazeFixation = {
          id: crypto.randomUUID(),
          centroid,
          duration: 0,
          startTime: currentGaze.timestamp,
          endTime: currentGaze.timestamp,
          targetElement: getElementAtPoint(centroid.x, centroid.y),
        };
        setCurrentFixation(newFixation);
      } else {
        // Update existing fixation
        setCurrentFixation(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            duration: currentGaze.timestamp - prev.startTime,
            endTime: currentGaze.timestamp,
          };

          // Check if fixation is long enough to record
          if (updated.duration >= config.fixationThresholdMs) {
            // Add to history if not already there
            const exists = fixationHistoryRef.current.some(f => f.id === updated.id);
            if (!exists) {
              fixationHistoryRef.current.push(updated);
              if (fixationHistoryRef.current.length > 20) {
                fixationHistoryRef.current = fixationHistoryRef.current.slice(-10);
              }
            }
          }

          return updated;
        });
      }
    } else {
      // End fixation
      if (currentFixation && currentFixation.duration >= config.fixationThresholdMs) {
        fixationHistoryRef.current.push(currentFixation);
        if (fixationHistoryRef.current.length > 20) {
          fixationHistoryRef.current = fixationHistoryRef.current.slice(-10);
        }
      }
      setCurrentFixation(null);
    }
  }, [currentFixation, config.fixationThresholdMs]);

  // ============================================================================
  // STRESS PROCESSING
  // ============================================================================

  const processStress = useCallback(() => {
    // Calculate stress indicators
    const indicators = calculateStressIndicators();

    // Combine indicators into stress score
    const rawStress = calculateStressScore(indicators);

    // Smooth stress value
    stressHistoryRef.current.push(rawStress);
    if (stressHistoryRef.current.length > 30) {
      stressHistoryRef.current = stressHistoryRef.current.slice(-15);
    }

    const smoothedStress = stressHistoryRef.current.reduce((a, b) => a + b, 0) /
      stressHistoryRef.current.length;

    // Determine trend
    const trend = determineTrend(stressHistoryRef.current);

    setStressLevel({
      value: Math.round(smoothedStress),
      trend,
      confidence: Math.min(1, stressHistoryRef.current.length / 15),
      timestamp: Date.now(),
    });

    // Update attention and cognitive load
    setAttentionScore(calculateAttention());
    setCognitiveLoad(calculateCognitiveLoad(smoothedStress));
  }, []);

  const calculateStressIndicators = useCallback((): StressIndicators => {
    // Calculate blink rate
    const now = Date.now();
    const recentBlinks = blinkTimestampsRef.current.filter(t => now - t < 60000);
    const blinkRate = recentBlinks.length;

    // Calculate gaze stability
    const gazeStability = calculateGazeStability();

    // Simulated pupil dilation (would come from actual tracking)
    const pupilDilation = 0.5 + Math.random() * 0.2;

    return {
      blinkRate,
      pupilDilation,
      gazeStability,
    };
  }, []);

  const calculateStressScore = useCallback((indicators: StressIndicators): number => {
    // Weights for each indicator
    const weights = {
      blinkRate: 0.3,
      pupilDilation: 0.4,
      gazeStability: 0.3,
    };

    // Normalize indicators to 0-100 scale
    const normalizedBlink = Math.min(100, (indicators.blinkRate / 30) * 100); // 30 blinks/min = high stress
    const normalizedPupil = indicators.pupilDilation * 100;
    const normalizedStability = (1 - indicators.gazeStability) * 100; // Lower stability = higher stress

    return (
      normalizedBlink * weights.blinkRate +
      normalizedPupil * weights.pupilDilation +
      normalizedStability * weights.gazeStability
    );
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getSimulatedGaze = (): GazePoint | null => {
    // Simulate gaze based on last known mouse position
    // In production, this would use actual eye tracking
    const mouseX = (window as any).__lastMouseX || window.innerWidth / 2;
    const mouseY = (window as any).__lastMouseY || window.innerHeight / 2;

    return {
      x: mouseX + (Math.random() - 0.5) * 20,
      y: mouseY + (Math.random() - 0.5) * 20,
      timestamp: Date.now(),
      confidence: 0.7,
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
    return element?.id || element?.getAttribute('data-biometric-id') || undefined;
  };

  const calculateGazeStability = (): number => {
    const history = gazeHistoryRef.current;
    if (history.length < 5) return 1;

    const recent = history.slice(-10);
    const centroid = calculateCentroid(recent);
    const dispersion = calculateDispersion(recent, centroid);

    // Normalize: 0 dispersion = 1 stability, 200px dispersion = 0 stability
    return Math.max(0, 1 - dispersion / 200);
  };

  const determineTrend = (history: number[]): 'RISING' | 'STABLE' | 'FALLING' => {
    if (history.length < 5) return 'STABLE';

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

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

    // More fixations with longer duration = higher attention
    const totalFixationTime = recentFixations.reduce((sum, f) => sum + f.duration, 0);
    const maxExpectedTime = 30000; // 30 seconds

    return Math.min(100, (totalFixationTime / maxExpectedTime) * 100);
  };

  const calculateCognitiveLoad = (stress: number): number => {
    // Cognitive load correlates with stress and attention demands
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

      // Update kernel adaptive UI setting
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

    window.addEventListener('mousemove', handleMouseMove);
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
    start,
    stop,
    calibrate,
    setConfig,
    getContext: getContextInternal,
  };
};
