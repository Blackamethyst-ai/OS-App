/**
 * BIOMETRIC PANEL
 *
 * Displays biometric sensor status, gaze tracking visualization,
 * and stress level indicators. Integrates with the adaptive UI system.
 */

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Brain,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Power,
  Settings,
} from 'lucide-react';
import { useAppStore } from '../store';
import { useBiometricSensor } from '../hooks/useBiometricSensor';
import { useStressDetector } from '../hooks/useStressDetector';
import { cn } from '../utils/cn';

interface BiometricPanelProps {
  compact?: boolean;
  showControls?: boolean;
}

export const BiometricPanel = memo(({ compact = false, showControls = true }: BiometricPanelProps) => {
  const { biometric, actions } = useAppStore();
  const { setBiometricState } = actions;

  const {
    isActive,
    stressLevel,
    attentionScore,
    cognitiveLoad,
    gazePoint,
    currentFixation,
    start,
    stop,
    setConfig,
  } = useBiometricSensor();

  const {
    uiComplexity,
    adaptation,
    isAdapting,
    enable: enableStressDetector,
    disable: disableStressDetector,
    forceComplexity,
  } = useStressDetector();

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
    if (level < 30) return '#10b981'; // Green
    if (level < 60) return '#f59e0b'; // Yellow
    if (level < 80) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getStressLabel = (level: number): string => {
    if (level < 30) return 'Relaxed';
    if (level < 60) return 'Normal';
    if (level < 80) return 'Elevated';
    return 'High';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded-md">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          )}
        />
        <span className="text-xs text-white/60">
          {isActive ? `Stress: ${stressLevel.value}%` : 'Biometric Off'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-white">Biometric Sensors</span>
        </div>
        <div className="flex items-center gap-2">
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
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{stressLevel.value}%</span>
            <span className={cn(
              'text-xs',
              stressLevel.trend === 'RISING' ? 'text-red-400' :
              stressLevel.trend === 'FALLING' ? 'text-green-400' : 'text-white/40'
            )}>
              {stressLevel.trend === 'RISING' ? '↑' :
               stressLevel.trend === 'FALLING' ? '↓' : '−'}
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

      {/* Gaze Tracking Indicator */}
      {currentFixation && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-300">
              Fixation detected: {Math.round(currentFixation.duration)}ms
              {currentFixation.targetElement && (
                <span className="text-cyan-400/60"> on {currentFixation.targetElement}</span>
              )}
            </span>
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

      {/* Controls */}
      {showControls && (
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => (isActive ? stop() : start())}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors',
              isActive
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
            )}
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
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Adaptive UI
          </button>
        </div>
      )}
    </div>
  );
});

BiometricPanel.displayName = 'BiometricPanel';
