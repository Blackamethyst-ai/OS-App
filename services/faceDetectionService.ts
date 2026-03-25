/**
 * FACE DETECTION SERVICE
 *
 * Real face detection and eye tracking using face-api.js
 * Provides:
 * - Face detection with bounding box
 * - 68-point facial landmarks for eye tracking
 * - Face expressions for stress estimation
 * - Gaze estimation from eye landmarks
 */

import { logger } from './logger';

// face-api.js is dynamically imported to reduce initial bundle size (~1.5MB)
// It only loads when biometrics are actually initialized
let faceapi: typeof import('face-api.js') | null = null;

// ============================================================================
// TYPES
// ============================================================================

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: FaceLandmarks;
  expressions?: FaceExpressions;
  gazeEstimate?: GazeEstimate;
}

export interface FaceLandmarks {
  leftEye: Point[];
  rightEye: Point[];
  nose: Point[];
  mouth: Point[];
  jawOutline: Point[];
  leftEyebrow: Point[];
  rightEyebrow: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface FaceExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface GazeEstimate {
  x: number;  // Screen X coordinate
  y: number;  // Screen Y coordinate
  confidence: number;
  direction: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  pupilDilation: number;  // 0-1 estimated from eye openness
}

export interface StressEstimate {
  level: number;  // 0-100
  confidence: number;
  indicators: {
    eyeStrainScore: number;
    blinkRate: number;
    expressionTension: number;
  };
}

export type DetectionQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE';

// ============================================================================
// FACE DETECTION SERVICE
// ============================================================================

class FaceDetectionService {
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private lastDetection: FaceDetectionResult | null = null;
  private blinkHistory: number[] = [];  // Timestamps of blinks
  private lastEyeOpenness: number = 1;
  private frameCount: number = 0;
  private detectionCount: number = 0;

  /**
   * Initialize face-api.js models
   * Dynamically imports face-api.js on first use to reduce initial bundle
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    logger.debug('Loading face-api.js...', undefined, 'FaceDetection');

    try {
      // Dynamic import - only loads when biometrics are used
      if (!faceapi) {
        faceapi = await import('face-api.js');
        logger.debug('face-api.js loaded', undefined, 'FaceDetection');
      }

      // Load models from public folder
      const modelPath = '/models';

      await Promise.all([
        // SSD MobileNet is more accurate than TinyFaceDetector
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),  // Fallback
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      ]);

      this.isInitialized = true;
      logger.info('Models loaded successfully (SSD MobileNet + Tiny)', undefined, 'FaceDetection');
      return true;
    } catch (error) {
      logger.error('Failed to load models', error, 'FaceDetection');
      this.isLoading = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Detect face in video frame
   */
  async detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!this.isInitialized || !faceapi) {
      const initialized = await this.initialize();
      if (!initialized || !faceapi) {
        return { detected: false, confidence: 0 };
      }
    }

    this.frameCount++;

    try {
      // Use SSD MobileNet for more accurate detection
      // It's slower but significantly more accurate than TinyFaceDetector
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.3,  // Lower threshold to catch more faces
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        this.lastDetection = { detected: false, confidence: 0 };
        return this.lastDetection;
      }

      this.detectionCount++;
      const { detection: faceDetection, landmarks, expressions } = detection;

      // Calculate face area ratio (larger face = better tracking)
      const videoArea = (video.videoWidth || 640) * (video.videoHeight || 480);
      const faceArea = faceDetection.box.width * faceDetection.box.height;
      const faceAreaRatio = faceArea / videoArea;

      // Boost confidence based on face size (ideal: 10-30% of frame)
      // Too small = far away, too large = too close
      const idealFaceRatio = 0.15;
      const faceBoost = 1 - Math.min(1, Math.abs(faceAreaRatio - idealFaceRatio) / idealFaceRatio);

      // Combined confidence: base detection score + face size bonus
      const boostedConfidence = Math.min(1, faceDetection.score * 0.7 + faceBoost * 0.3);

      // Extract landmark points
      const landmarkPoints = this.extractLandmarks(landmarks);

      // Estimate gaze from eye landmarks
      const gazeEstimate = this.estimateGaze(landmarkPoints, video);

      // Track blinks
      this.trackBlinks(landmarkPoints);

      // Build result with boosted confidence
      const result: FaceDetectionResult = {
        detected: true,
        confidence: boostedConfidence,
        boundingBox: {
          x: faceDetection.box.x,
          y: faceDetection.box.y,
          width: faceDetection.box.width,
          height: faceDetection.box.height,
        },
        landmarks: landmarkPoints,
        expressions: {
          neutral: expressions.neutral,
          happy: expressions.happy,
          sad: expressions.sad,
          angry: expressions.angry,
          fearful: expressions.fearful,
          disgusted: expressions.disgusted,
          surprised: expressions.surprised,
        },
        gazeEstimate,
      };

      this.lastDetection = result;
      return result;
    } catch (error) {
      logger.error('Detection error', error, 'FaceDetection');
      return { detected: false, confidence: 0 };
    }
  }

  /**
   * Extract landmark points from face-api landmarks
   */
  private extractLandmarks(landmarks: any): FaceLandmarks {
    const positions = landmarks.positions;

    return {
      // Left eye: points 36-41
      leftEye: positions.slice(36, 42).map((p: any) => ({ x: p.x, y: p.y })),
      // Right eye: points 42-47
      rightEye: positions.slice(42, 48).map((p: any) => ({ x: p.x, y: p.y })),
      // Nose: points 27-35
      nose: positions.slice(27, 36).map((p: any) => ({ x: p.x, y: p.y })),
      // Mouth: points 48-67
      mouth: positions.slice(48, 68).map((p: any) => ({ x: p.x, y: p.y })),
      // Jaw outline: points 0-16
      jawOutline: positions.slice(0, 17).map((p: any) => ({ x: p.x, y: p.y })),
      // Left eyebrow: points 17-21
      leftEyebrow: positions.slice(17, 22).map((p: any) => ({ x: p.x, y: p.y })),
      // Right eyebrow: points 22-26
      rightEyebrow: positions.slice(22, 27).map((p: any) => ({ x: p.x, y: p.y })),
    };
  }

  /**
   * Estimate gaze direction from eye landmarks
   */
  private estimateGaze(landmarks: FaceLandmarks, video: HTMLVideoElement): GazeEstimate {
    const { leftEye, rightEye } = landmarks;

    // Calculate eye centers
    const leftEyeCenter = this.getCenter(leftEye);
    const rightEyeCenter = this.getCenter(rightEye);

    // Average eye center
    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    // Calculate eye openness (for blink/pupil dilation estimation)
    const leftEyeOpenness = this.calculateEyeOpenness(leftEye);
    const rightEyeOpenness = this.calculateEyeOpenness(rightEye);
    const avgOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

    // Estimate gaze direction based on eye position relative to face
    // This is a simplified estimation - real gaze tracking would use iris detection
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Map eye position to screen coordinates (simplified)
    // In reality, this would need calibration
    const normalizedX = eyeCenter.x / videoWidth;
    const normalizedY = eyeCenter.y / videoHeight;

    // Flip X because webcam is mirrored
    const gazeX = (1 - normalizedX) * window.innerWidth;
    const gazeY = normalizedY * window.innerHeight;

    // Determine direction
    let direction: GazeEstimate['direction'] = 'CENTER';
    if (normalizedX < 0.35) direction = 'RIGHT';  // Mirrored
    else if (normalizedX > 0.65) direction = 'LEFT';  // Mirrored
    else if (normalizedY < 0.35) direction = 'UP';
    else if (normalizedY > 0.65) direction = 'DOWN';

    // Improved confidence: based on eye openness, face detection, and gaze stability
    // avgOpenness > 0.5 = eyes open, < 0.2 = blinking/closed
    const openEyesBonus = avgOpenness > 0.3 ? 0.3 : 0;
    const centerGazeBonus = (normalizedX > 0.3 && normalizedX < 0.7) ? 0.2 : 0;
    const confidence = Math.min(1, 0.4 + openEyesBonus + centerGazeBonus + avgOpenness * 0.1);

    return {
      x: gazeX,
      y: gazeY,
      confidence,
      direction,
      pupilDilation: avgOpenness,
    };
  }

  /**
   * Calculate center point of a set of points
   */
  private getCenter(points: Point[]): Point {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  /**
   * Calculate eye openness from eye landmarks (vertical distance / horizontal distance)
   */
  private calculateEyeOpenness(eye: Point[]): number {
    if (eye.length < 6) return 0.5;

    // Eye points: 0=left corner, 1=upper-left, 2=upper-right, 3=right corner, 4=lower-right, 5=lower-left
    const verticalDist = (
      Math.abs(eye[1].y - eye[5].y) + Math.abs(eye[2].y - eye[4].y)
    ) / 2;
    const horizontalDist = Math.abs(eye[3].x - eye[0].x);

    if (horizontalDist === 0) return 0.5;

    // Eye aspect ratio (EAR)
    const ear = verticalDist / horizontalDist;

    // Normalize to 0-1 range (typical EAR is 0.2-0.4 when open)
    return Math.min(1, Math.max(0, ear / 0.35));
  }

  /**
   * Track blinks based on eye openness changes
   */
  private trackBlinks(landmarks: FaceLandmarks): void {
    const leftOpenness = this.calculateEyeOpenness(landmarks.leftEye);
    const rightOpenness = this.calculateEyeOpenness(landmarks.rightEye);
    const avgOpenness = (leftOpenness + rightOpenness) / 2;

    // Detect blink: eye was open, now closed
    if (this.lastEyeOpenness > 0.3 && avgOpenness < 0.2) {
      this.blinkHistory.push(Date.now());
      // Keep only last 60 seconds of blink data
      const oneMinuteAgo = Date.now() - 60000;
      this.blinkHistory = this.blinkHistory.filter(t => t > oneMinuteAgo);
    }

    this.lastEyeOpenness = avgOpenness;
  }

  /**
   * Get blink rate (blinks per minute)
   */
  getBlinkRate(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentBlinks = this.blinkHistory.filter(t => t > oneMinuteAgo);
    return recentBlinks.length;
  }

  /**
   * Estimate stress level from facial expressions and eye metrics
   */
  estimateStress(): StressEstimate {
    if (!this.lastDetection?.expressions || !this.lastDetection.landmarks) {
      return {
        level: 0,
        confidence: 0,
        indicators: { eyeStrainScore: 0, blinkRate: 0, expressionTension: 0 },
      };
    }

    const { expressions, landmarks } = this.lastDetection;

    // Eye strain score (based on reduced blinking and eye openness)
    const blinkRate = this.getBlinkRate();
    const normalBlinkRate = 15;  // Average is 15-20 blinks per minute
    const eyeStrainScore = Math.max(0, Math.min(100,
      (1 - blinkRate / normalBlinkRate) * 50 +
      (1 - this.lastEyeOpenness) * 50
    ));

    // Expression tension (negative emotions indicate stress)
    const expressionTension = Math.min(100,
      (expressions.angry * 100) +
      (expressions.fearful * 80) +
      (expressions.sad * 60) +
      (expressions.disgusted * 50) +
      (expressions.surprised * 20)
    );

    // Combined stress level
    const level = Math.min(100, Math.max(0,
      eyeStrainScore * 0.4 +
      expressionTension * 0.4 +
      (blinkRate > 25 ? 20 : 0)  // High blink rate can also indicate stress
    ));

    return {
      level,
      confidence: this.lastDetection.confidence,
      indicators: {
        eyeStrainScore,
        blinkRate,
        expressionTension,
      },
    };
  }

  /**
   * Get the last detection result
   */
  getLastDetection(): FaceDetectionResult | null {
    return this.lastDetection;
  }

  /**
   * Get service statistics
   */
  getStats(): { frameCount: number; detectionCount: number; detectionRate: number } {
    return {
      frameCount: this.frameCount,
      detectionCount: this.detectionCount,
      detectionRate: this.frameCount > 0 ? this.detectionCount / this.frameCount : 0,
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.frameCount = 0;
    this.detectionCount = 0;
    this.blinkHistory = [];
    this.lastEyeOpenness = 1;
    this.lastDetection = null;
  }

  /**
   * Get detection quality based on confidence
   */
  getDetectionQuality(): DetectionQuality {
    if (!this.lastDetection?.detected) return 'NONE';

    const conf = this.lastDetection.confidence;
    if (conf >= 0.7) return 'HIGH';
    if (conf >= 0.5) return 'MEDIUM';
    return 'LOW';
  }
}

// Singleton export
export const faceDetectionService = new FaceDetectionService();
