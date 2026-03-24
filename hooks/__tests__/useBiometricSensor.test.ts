// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockKernelUpdateBiometric = vi.hoisted(() => vi.fn());
const mockKernelSetAdaptiveUI = vi.hoisted(() => vi.fn());
const mockFaceDetect = vi.hoisted(() => vi.fn().mockResolvedValue({ detected: false, confidence: 0 }));
const mockFaceInit = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockGetBlinkRate = vi.hoisted(() => vi.fn().mockReturnValue(15));
const mockEstimateStress = vi.hoisted(() => vi.fn().mockReturnValue({ level: 0, confidence: 0 }));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/kernel/AgentKernel', () => ({
  agentKernel: {
    updateBiometricContext: mockKernelUpdateBiometric,
    setAdaptiveUIEnabled: mockKernelSetAdaptiveUI,
  },
}));

vi.mock('../../services/faceDetectionService', () => ({
  faceDetectionService: {
    detectFace: mockFaceDetect,
    initialize: mockFaceInit,
    getBlinkRate: mockGetBlinkRate,
    estimateStress: mockEstimateStress,
  },
}));

vi.mock('../../services/biometric', () => ({
  BiometricPerformance: {},
  DEFAULT_PERFORMANCE: {
    fps: 0, targetFps: 60, frameTime: 0, processingLatency: 0,
    gazeConfidence: 0, stressConfidence: 0, lightingQuality: 0,
    lightingStatus: 'UNKNOWN', faceDetected: false, overallConfidence: 0,
    droppedFrames: 0,
  },
  GAZE_HISTORY_MAX: 500,
  GAZE_HISTORY_TRIM: 250,
  FIXATION_HISTORY_MAX: 100,
  FIXATION_HISTORY_TRIM: 50,
  calculateCentroid: vi.fn().mockReturnValue({ x: 100, y: 100 }),
  calculateDispersion: vi.fn().mockReturnValue(10),
  getElementAtPoint: vi.fn().mockReturnValue(undefined),
  calculateGazeStability: vi.fn().mockReturnValue(0.8),
  isFixating: vi.fn().mockReturnValue(false),
  analyzeLighting: vi.fn().mockReturnValue({ lightingQuality: 80, lightingStatus: 'GOOD' }),
  ConfidenceBuffer: class { add = vi.fn().mockReturnValue(0.5); },
  PerformanceMonitor: class { constructor(_cb?: any) {} check = vi.fn(); },
  StressHysteresisManager: class {},
  calculateStressScore: vi.fn().mockReturnValue(30),
  determineTrend: vi.fn().mockReturnValue('STABLE'),
  calculateCognitiveLoad: vi.fn().mockReturnValue(25),
  emitFixationEvent: vi.fn(),
  emitGazeUpdateEvent: vi.fn(),
  emitBiometricFallback: vi.fn(),
}));

import { useBiometricSensor } from '../useBiometricSensor';

// ============================================================================
// TESTS
// ============================================================================

describe('useBiometricSensor', () => {
  let rafCallbacks: (() => void)[];
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];

    // Mock requestAnimationFrame to prevent infinite loops / OOM
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    // Mock document.createElement to return a video element with play()
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') {
        const el = originalCreateElement('video');
        (el as any).play = vi.fn().mockResolvedValue(undefined);
        return el;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current.isActive).toBe(false);
    expect(result.current.isCalibrating).toBe(false);
    expect(result.current.gazePoint).toBeNull();
    expect(result.current.currentFixation).toBeNull();
    expect(result.current.attentionScore).toBe(100);
    expect(result.current.cognitiveLoad).toBe(30);
    expect(result.current.realtimeMode).toBe(false);
  });

  it('should return default config', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current.config.enabled).toBe(false);
    expect(result.current.config.source).toBe('WEBCAM');
    expect(result.current.config.gazeTrackingEnabled).toBe(true);
    expect(result.current.config.stressDetectionEnabled).toBe(true);
    expect(result.current.config.samplingRateHz).toBe(60);
  });

  it('should return default performance metrics', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current.performance.fps).toBe(0);
    expect(result.current.performance.targetFps).toBe(60);
  });

  it('should return initial stress level', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current.stressLevel.value).toBe(0);
    expect(result.current.stressLevel.trend).toBe('STABLE');
    expect(result.current.stressLevel.confidence).toBe(0);
  });

  it('should update config via setConfig', () => {
    const { result } = renderHook(() => useBiometricSensor());

    act(() => {
      result.current.setConfig({ stressThreshold: 80 });
    });

    expect(result.current.config.stressThreshold).toBe(80);
    // Other config values should be preserved
    expect(result.current.config.source).toBe('WEBCAM');
  });

  it('should call agentKernel.setAdaptiveUIEnabled when adaptiveUIEnabled config changes', () => {
    const { result } = renderHook(() => useBiometricSensor());

    act(() => {
      result.current.setConfig({ adaptiveUIEnabled: false });
    });

    expect(mockKernelSetAdaptiveUI).toHaveBeenCalledWith(false);
  });

  it('should toggle realtime mode', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current.realtimeMode).toBe(false);

    act(() => {
      result.current.setRealtimeMode(true);
    });

    expect(result.current.realtimeMode).toBe(true);
  });

  it('should not start if already active', async () => {
    // Use the permission denied fallback path to set isActive = true
    // (avoids needing full video element mocking)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useBiometricSensor());

    // Start once via fallback path
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isActive).toBe(true);

    const callCountAfterFirstStart = mockAddLog.mock.calls.length;

    // Starting again should be a no-op (isActive guard)
    await act(async () => {
      await result.current.start();
    });

    // No new log calls should have been made
    expect(mockAddLog.mock.calls.length).toBe(callCountAfterFirstStart);
  });

  it('should handle webcam permission denied by falling back to mouse tracking', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useBiometricSensor());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.config.source).toBe('MOUSE_FALLBACK');
    expect(mockAddLog).toHaveBeenCalledWith(
      'WARN',
      'BIOMETRIC: Webcam denied - switching to mouse tracking mode'
    );
  });

  it('should handle no webcam found error', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('NotFoundError')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useBiometricSensor());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.config.source).toBe('MOUSE_FALLBACK');
  });

  it('should handle unknown start errors', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('SomeOtherError')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useBiometricSensor());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isActive).toBe(false);
    expect(mockAddLog).toHaveBeenCalledWith('ERROR', 'BIOMETRIC: Failed to start - SomeOtherError');
  });

  it('should not calibrate if not active', async () => {
    const { result } = renderHook(() => useBiometricSensor());

    let calibrationResult: boolean = true;
    await act(async () => {
      calibrationResult = await result.current.calibrate();
    });

    expect(calibrationResult).toBe(false);
    expect(mockAddLog).toHaveBeenCalledWith('WARN', 'BIOMETRIC: Start sensors before calibrating');
  });

  it('should return biometric context from getContext', () => {
    const { result } = renderHook(() => useBiometricSensor());

    const context = result.current.getContext();

    expect(context).toHaveProperty('stressLevel');
    expect(context).toHaveProperty('attentionScore');
    expect(context).toHaveProperty('cognitiveLoad');
    expect(context.stressLevel.value).toBe(0);
    expect(context.attentionScore).toBe(100);
  });

  it('should stop and clean up when stop is called while active', async () => {
    // Start via fallback path to become active without needing full video mocking
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useBiometricSensor());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.gazePoint).toBeNull();
    expect(result.current.currentFixation).toBeNull();
  });

  it('should not stop if not active', () => {
    const { result } = renderHook(() => useBiometricSensor());

    act(() => {
      result.current.stop();
    });

    // Should not log anything since it was not active
    expect(mockAddLog).not.toHaveBeenCalledWith('SYSTEM', 'BIOMETRIC: Sensors stopped');
  });

  it('should expose all expected return properties', () => {
    const { result } = renderHook(() => useBiometricSensor());

    expect(result.current).toHaveProperty('isActive');
    expect(result.current).toHaveProperty('isCalibrating');
    expect(result.current).toHaveProperty('gazePoint');
    expect(result.current).toHaveProperty('currentFixation');
    expect(result.current).toHaveProperty('stressLevel');
    expect(result.current).toHaveProperty('attentionScore');
    expect(result.current).toHaveProperty('cognitiveLoad');
    expect(result.current).toHaveProperty('config');
    expect(result.current).toHaveProperty('performance');
    expect(result.current).toHaveProperty('realtimeMode');
    expect(result.current).toHaveProperty('start');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('calibrate');
    expect(result.current).toHaveProperty('setConfig');
    expect(result.current).toHaveProperty('setRealtimeMode');
    expect(result.current).toHaveProperty('getContext');
  });
});
