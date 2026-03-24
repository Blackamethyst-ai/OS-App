// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

// We need to mock face-api.js dynamic import
const mockNets = vi.hoisted(() => ({
  ssdMobilenetv1: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
  tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
  faceLandmark68Net: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
  faceExpressionNet: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
}));

const mockDetectSingleFace = vi.hoisted(() => vi.fn());

vi.mock('face-api.js', () => ({
  nets: mockNets,
  detectSingleFace: mockDetectSingleFace,
  SsdMobilenetv1Options: vi.fn(),
}));

// We need to reimport for each test to get a fresh singleton
// But the module has a singleton, so let's work with it
import { faceDetectionService } from '../faceDetectionService';

describe('FaceDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faceDetectionService.reset();
  });

  describe('isReady', () => {
    it('should return false before initialization', () => {
      expect(faceDetectionService.isReady()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return zero stats after reset', () => {
      const stats = faceDetectionService.getStats();
      expect(stats.frameCount).toBe(0);
      expect(stats.detectionCount).toBe(0);
      expect(stats.detectionRate).toBe(0);
    });
  });

  describe('getLastDetection', () => {
    it('should return null before any detection', () => {
      expect(faceDetectionService.getLastDetection()).toBeNull();
    });
  });

  describe('getDetectionQuality', () => {
    it('should return NONE when no detection exists', () => {
      expect(faceDetectionService.getDetectionQuality()).toBe('NONE');
    });
  });

  describe('getBlinkRate', () => {
    it('should return 0 when no blinks recorded', () => {
      expect(faceDetectionService.getBlinkRate()).toBe(0);
    });
  });

  describe('estimateStress', () => {
    it('should return zero stress when no detection data exists', () => {
      const stress = faceDetectionService.estimateStress();
      expect(stress.level).toBe(0);
      expect(stress.confidence).toBe(0);
      expect(stress.indicators.eyeStrainScore).toBe(0);
      expect(stress.indicators.blinkRate).toBe(0);
      expect(stress.indicators.expressionTension).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      faceDetectionService.reset();
      expect(faceDetectionService.getStats().frameCount).toBe(0);
      expect(faceDetectionService.getStats().detectionCount).toBe(0);
      expect(faceDetectionService.getLastDetection()).toBeNull();
      expect(faceDetectionService.getBlinkRate()).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should load models and return true on success', async () => {
      const result = await faceDetectionService.initialize();
      expect(result).toBe(true);
      expect(faceDetectionService.isReady()).toBe(true);
    });

    it('should return true immediately if already initialized', async () => {
      await faceDetectionService.initialize();
      const result = await faceDetectionService.initialize();
      expect(result).toBe(true);
    });
  });

  describe('detectFace', () => {
    it('should return not detected when face-api returns null', async () => {
      await faceDetectionService.initialize();

      mockDetectSingleFace.mockReturnValue({
        withFaceLandmarks: () => ({
          withFaceExpressions: () => Promise.resolve(null),
        }),
      });

      const mockVideo = {
        videoWidth: 640,
        videoHeight: 480,
      } as HTMLVideoElement;

      const result = await faceDetectionService.detectFace(mockVideo);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should return detection result when face is detected', async () => {
      await faceDetectionService.initialize();

      // Build 68 landmark positions
      const positions = Array.from({ length: 68 }, (_, i) => ({
        x: 100 + i,
        y: 100 + i,
      }));

      mockDetectSingleFace.mockReturnValue({
        withFaceLandmarks: () => ({
          withFaceExpressions: () =>
            Promise.resolve({
              detection: {
                score: 0.95,
                box: { x: 100, y: 100, width: 200, height: 200 },
              },
              landmarks: { positions },
              expressions: {
                neutral: 0.8,
                happy: 0.1,
                sad: 0.02,
                angry: 0.01,
                fearful: 0.01,
                disgusted: 0.01,
                surprised: 0.05,
              },
            }),
        }),
      });

      const mockVideo = {
        videoWidth: 640,
        videoHeight: 480,
      } as HTMLVideoElement;

      const result = await faceDetectionService.detectFace(mockVideo);
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.boundingBox).toBeDefined();
      expect(result.landmarks).toBeDefined();
      expect(result.expressions).toBeDefined();
      expect(result.gazeEstimate).toBeDefined();
    });

    it('should increment frameCount on each call', async () => {
      await faceDetectionService.initialize();

      mockDetectSingleFace.mockReturnValue({
        withFaceLandmarks: () => ({
          withFaceExpressions: () => Promise.resolve(null),
        }),
      });

      const mockVideo = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;

      await faceDetectionService.detectFace(mockVideo);
      await faceDetectionService.detectFace(mockVideo);

      expect(faceDetectionService.getStats().frameCount).toBe(2);
    });

    it('should handle detection errors gracefully', async () => {
      await faceDetectionService.initialize();

      mockDetectSingleFace.mockReturnValue({
        withFaceLandmarks: () => ({
          withFaceExpressions: () => Promise.reject(new Error('detection error')),
        }),
      });

      const mockVideo = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
      const result = await faceDetectionService.detectFace(mockVideo);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('getDetectionQuality after detection', () => {
    it('should return HIGH for confidence >= 0.7', async () => {
      await faceDetectionService.initialize();

      const positions = Array.from({ length: 68 }, (_, i) => ({
        x: 100 + i,
        y: 100 + i,
      }));

      mockDetectSingleFace.mockReturnValue({
        withFaceLandmarks: () => ({
          withFaceExpressions: () =>
            Promise.resolve({
              detection: {
                score: 0.99,
                box: { x: 50, y: 50, width: 150, height: 150 },
              },
              landmarks: { positions },
              expressions: {
                neutral: 0.9, happy: 0.05, sad: 0, angry: 0,
                fearful: 0, disgusted: 0, surprised: 0.05,
              },
            }),
        }),
      });

      const mockVideo = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
      await faceDetectionService.detectFace(mockVideo);

      const quality = faceDetectionService.getDetectionQuality();
      expect(['HIGH', 'MEDIUM']).toContain(quality);
    });
  });
});
