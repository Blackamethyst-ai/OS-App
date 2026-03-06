/**
 * BIOMETRIC PANEL - Real-Time Performance Edition
 *
 * Displays biometric sensor status with instant visual feedback:
 * - Real-time FPS and latency metrics
 * - Lighting quality indicator with warnings
 * - Confidence meters for all measurements
 * - Debug mode toggle for instant stress response
 * - GazeReticle integration for visual tracking
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  Brain,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Power,
  Settings,
  Zap,
  Sun,
  SunDim,
  Moon,
  Crosshair,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useBiometricSensor, BiometricPerformance } from '../../hooks/useBiometricSensor';
import { useStressDetector } from '../../hooks/useStressDetector';
import { faceDetectionService, DetectionQuality } from '../../services/faceDetectionService';
import { GazeReticle } from './GazeReticle';
import { cn } from '../../utils/cn';

interface BiometricPanelProps {
  compact?: boolean;
  showControls?: boolean;
  showReticle?: boolean;
}

export const BiometricPanel = memo(({
  compact = false,
  showControls = true,
  showReticle = true,
}: BiometricPanelProps) => {
  const { biometric, actions } = useAppStore();
  const { setBiometricState } = actions;

  const {
    isActive,
    stressLevel,
    attentionScore,
    cognitiveLoad,
    gazePoint,
    currentFixation,
    performance,
    realtimeMode,
    start,
    stop,
    setConfig,
    setRealtimeMode,
  } = useBiometricSensor();

  const {
    uiComplexity,
    adaptation,
    isAdapting,
    enable: enableStressDetector,
    disable: disableStressDetector,
    forceComplexity,
  } = useStressDetector();

  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Sync biometric state to store
  useEffect(() => {
    setBiometricState({
      isActive,
      currentStressLevel: stressLevel.value,
      stressTrend: stressLevel.trend,
      attentionScore,
      cognitiveLoad,
      uiComplexity,
    });
  }, [isActive, stressLevel, attentionScore, cognitiveLoad, uiComplexity, setBiometricState]);

  const getStressColor = (level: number): string => {
    if (level < 30) return 'var(--plasma-green)'; // Green
    if (level < 60) return 'var(--amber)'; // Yellow
    if (level < 80) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getStressLabel = (level: number): string => {
    if (level < 30) return 'Relaxed';
    if (level < 60) return 'Normal';
    if (level < 80) return 'Elevated';
    return 'High';
  };

  const getLightingIcon = (status: BiometricPerformance['lightingStatus']) => {
    switch (status) {
      case 'GOOD': return <Sun className="w-3.5 h-3.5 text-yellow-400" />;
      case 'LOW': return <SunDim className="w-3.5 h-3.5 text-orange-400" />;
      case 'VERY_LOW': return <Moon className="w-3.5 h-3.5 text-red-400" />;
    }
  };

  const getLightingColor = (status: BiometricPerformance['lightingStatus']) => {
    switch (status) {
      case 'GOOD': return 'text-green-400';
      case 'LOW': return 'text-orange-400';
      case 'VERY_LOW': return 'text-red-400';
    }
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    if (fps >= 15) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'var(--plasma-green)';
    if (confidence >= 40) return 'var(--amber)';
    return '#ef4444';
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded-md">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            )}
          />
          <span className="text-xs text-white/60">
            {isActive ? `${performance.fps} FPS | Stress: ${stressLevel.value}%` : 'Biometric Off'}
          </span>
        </div>
        {showReticle && <GazeReticle enabled={isActive} />}
      </>
    );
  }

  return (
    <>
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 space-y-4">
        {/* Header with Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-white">Biometric Sensors</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Performance Badge */}
            {isActive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/30 rounded-full">
                <Zap className={cn('w-3 h-3', getFpsColor(performance.fps))} />
                <span className={cn('text-[10px] font-mono', getFpsColor(performance.fps))}>
                  {performance.fps} FPS
                </span>
              </div>
            )}
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              )}
            />
            <span className="text-xs text-white/60">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Performance Metrics Row - Only when active */}
        {isActive && (
          <div className="grid grid-cols-4 gap-2 p-2 bg-black/20 rounded-lg">
            {/* FPS */}
            <div className="text-center">
              <div className={cn('text-sm font-mono font-bold', getFpsColor(performance.fps))}>
                {performance.fps}
              </div>
              <div className="text-[9px] text-white/40">FPS</div>
            </div>

            {/* Latency */}
            <div className="text-center">
              <div className={cn(
                'text-sm font-mono font-bold',
                performance.processingLatency < 16 ? 'text-green-400' :
                performance.processingLatency < 33 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {performance.processingLatency.toFixed(1)}
              </div>
              <div className="text-[9px] text-white/40">ms</div>
            </div>

            {/* Lighting */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {getLightingIcon(performance.lightingStatus)}
                <span className={cn('text-sm font-mono font-bold', getLightingColor(performance.lightingStatus))}>
                  {performance.lightingQuality}%
                </span>
              </div>
              <div className="text-[9px] text-white/40">Light</div>
            </div>

            {/* Confidence */}
            <div className="text-center">
              <div
                className="text-sm font-mono font-bold"
                style={{ color: getConfidenceColor(performance.overallConfidence) }}
              >
                {Math.round(performance.overallConfidence)}%
              </div>
              <div className="text-[9px] text-white/40">Conf</div>
            </div>
          </div>
        )}

        {/* Lighting Warning */}
        <AnimatePresence>
          {isActive && performance.lightingStatus !== 'GOOD' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border',
                performance.lightingStatus === 'VERY_LOW'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-orange-500/10 border-orange-500/30'
              )}
            >
              {getLightingIcon(performance.lightingStatus)}
              <span className={cn(
                'text-xs',
                performance.lightingStatus === 'VERY_LOW' ? 'text-red-300' : 'text-orange-300'
              )}>
                {performance.lightingStatus === 'VERY_LOW'
                  ? `Very low light (${performance.lightingQuality}%) - Tracking unreliable. Add desk lamp.`
                  : `Low light (${performance.lightingQuality}%) - Tracking may be inaccurate.`
                }
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Stress Level */}
          <div className="bg-black/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60">Stress</span>
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: getStressColor(stressLevel.value) }}
              >
                {getStressLabel(stressLevel.value)}
              </span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: getStressColor(stressLevel.value) }}
                initial={{ width: 0 }}
                animate={{ width: `${stressLevel.value}%` }}
                transition={{ duration: realtimeMode ? 0.1 : 0.3 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">{stressLevel.value}%</span>
              <span className={cn(
                'text-xs flex items-center gap-1',
                stressLevel.trend === 'RISING' ? 'text-red-400' :
                stressLevel.trend === 'FALLING' ? 'text-green-400' : 'text-white/40'
              )}>
                {stressLevel.trend === 'RISING' ? '↑' :
                 stressLevel.trend === 'FALLING' ? '↓' : '−'}
                {realtimeMode && <Zap className="w-2.5 h-2.5" />}
              </span>
            </div>
          </div>

          {/* Attention Score */}
          <div className="bg-black/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60">Attention</span>
              </div>
              <span className="text-xs font-medium text-cyan-400">
                {attentionScore}%
              </span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${attentionScore}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {/* Gaze confidence sub-indicator */}
            {isActive && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Gaze confidence</span>
                <span style={{ color: getConfidenceColor(performance.gazeConfidence) }}>
                  {Math.round(performance.gazeConfidence)}%
                </span>
              </div>
            )}
          </div>

          {/* Cognitive Load */}
          <div className="bg-black/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60">Cognitive Load</span>
              </div>
              <span className="text-xs font-medium text-purple-400">
                {cognitiveLoad}%
              </span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${cognitiveLoad}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* UI Complexity */}
          <div className="bg-black/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60">UI Mode</span>
              </div>
              <AnimatePresence mode="wait">
                {isAdapting && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-amber-400"
                  >
                    Adapting...
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex gap-1">
              {(['FULL', 'REDUCED', 'MINIMAL', 'FLOW_STATE'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => forceComplexity(level)}
                  className={cn(
                    'flex-1 text-[10px] py-1 rounded transition-colors',
                    uiComplexity === level
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  )}
                >
                  {level === 'FLOW_STATE' ? 'Flow' : level.charAt(0) + level.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gaze Tracking Indicator with enhanced info */}
        {currentFixation && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-cyan-300">
                  Fixation: {(currentFixation.duration / 1000).toFixed(1)}s
                  {currentFixation.targetElement && (
                    <span className="text-cyan-400/60"> → {currentFixation.targetElement}</span>
                  )}
                </span>
              </div>
              {currentFixation.duration >= 2000 && (
                <span className="text-[10px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
                  LOCKED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stress Warning */}
        <AnimatePresence>
          {stressLevel.value > 70 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-2"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-300">
                  High stress detected. Consider taking a break or enabling Flow State mode.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Performance Warning */}
        <AnimatePresence>
          {isActive && performance.fps < 15 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-300">
                  Performance degraded ({performance.fps} FPS). Close other apps to improve tracking.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        {showControls && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            {/* Main Controls Row */}
            <div className="flex gap-2">
              <button
                onClick={() => (isActive ? stop() : start())}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                )}
                data-voice-id="biometric-sensors-toggle"
                aria-label={isActive ? 'Stop biometric sensors' : 'Start biometric sensors'}
              >
                <Power className="w-3.5 h-3.5" />
                {isActive ? 'Stop Sensors' : 'Start Sensors'}
              </button>
              <button
                onClick={() => setConfig({ adaptiveUIEnabled: !biometric.adaptiveUIEnabled })}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors',
                  biometric.adaptiveUIEnabled
                    ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}
                data-voice-id="biometric-adaptive-ui-toggle"
                aria-label="Toggle adaptive UI"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Adaptive UI
              </button>
            </div>

            {/* Debug Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setRealtimeMode(!realtimeMode)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                  realtimeMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}
              >
                <Timer className="w-3 h-3" />
                {realtimeMode ? 'Real-Time Debug ON' : 'Real-Time Debug'}
              </button>
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                  showDebugPanel
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}
              >
                {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>

            {/* Debug Panel */}
            <AnimatePresence>
              {showDebugPanel && isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/40 rounded-lg p-2 font-mono text-[10px] space-y-1"
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-white/40">Frame Time:</span>
                    <span className="text-white/80">{performance.frameTime.toFixed(1)}ms</span>

                    <span className="text-white/40">Processing:</span>
                    <span className="text-white/80">{performance.processingLatency.toFixed(2)}ms</span>

                    <span className="text-white/40">Dropped Frames:</span>
                    <span className={performance.droppedFrames > 10 ? 'text-red-400' : 'text-white/80'}>
                      {performance.droppedFrames}
                    </span>

                    <span className="text-white/40">Face Detected:</span>
                    <span className={performance.faceDetected ? 'text-green-400' : 'text-red-400'}>
                      {performance.faceDetected ? 'Yes' : 'No'}
                    </span>

                    <span className="text-white/40">Detection Quality:</span>
                    <span className={cn(
                      faceDetectionService.getDetectionQuality() === 'HIGH' && 'text-green-400',
                      faceDetectionService.getDetectionQuality() === 'MEDIUM' && 'text-yellow-400',
                      faceDetectionService.getDetectionQuality() === 'LOW' && 'text-orange-400',
                      faceDetectionService.getDetectionQuality() === 'NONE' && 'text-red-400',
                    )}>
                      {faceDetectionService.getDetectionQuality()}
                    </span>

                    <span className="text-white/40">Gaze Conf:</span>
                    <span style={{ color: getConfidenceColor(performance.gazeConfidence) }}>
                      {performance.gazeConfidence.toFixed(1)}%
                    </span>

                    <span className="text-white/40">Stress Conf:</span>
                    <span style={{ color: getConfidenceColor(performance.stressConfidence) }}>
                      {performance.stressConfidence.toFixed(1)}%
                    </span>

                    <span className="text-white/40">Gaze Point:</span>
                    <span className="text-white/80">
                      {gazePoint ? `${Math.round(gazePoint.x)}, ${Math.round(gazePoint.y)}` : 'N/A'}
                    </span>

                    <span className="text-white/40">Mode:</span>
                    <span className={realtimeMode ? 'text-amber-400' : 'text-blue-400'}>
                      {realtimeMode ? 'Fast (1s avg)' : 'Stable (10s avg)'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Gaze Reticle Overlay */}
      {showReticle && <GazeReticle enabled={isActive} showConfidence={true} showFixationTimer={true} />}
    </>
  );
});

BiometricPanel.displayName = 'BiometricPanel';
