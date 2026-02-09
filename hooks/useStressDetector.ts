/**
 * STRESS DETECTOR HOOK
 *
 * Detects user stress levels and triggers adaptive UI mutations.
 * Transforms the UI from "Complex Grid" to "Simplified Flow-State" view
 * when stress thresholds are exceeded.
 *
 * Features:
 * - Stress level monitoring
 * - Threshold-based UI adaptation
 * - Gradual complexity reduction
 * - Recovery detection
 *
 * Reference: Master Proposal - Stress-Responsive UI Mutation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel/AgentKernel';
import { StressLevel } from '../services/kernel/types';

type UIComplexityLevel = 'FULL' | 'REDUCED' | 'MINIMAL' | 'FLOW_STATE';

interface StressDetectorConfig {
  enabled: boolean;
  adaptiveUIEnabled: boolean;
  stressThresholds: {
    reduced: number;    // Trigger REDUCED mode
    minimal: number;    // Trigger MINIMAL mode
    flowState: number;  // Trigger FLOW_STATE mode
  };
  recoveryThreshold: number;
  debounceMs: number;
  transitionDurationMs: number;
}

interface UIAdaptation {
  level: UIComplexityLevel;
  hiddenElements: string[];
  reducedAnimations: boolean;
  simplifiedLayout: boolean;
  focusMode: boolean;
}

interface UseStressDetectorReturn {
  // State
  stressLevel: StressLevel;
  uiComplexity: UIComplexityLevel;
  adaptation: UIAdaptation;
  isAdapting: boolean;
  stressHistory: number[];

  // Actions
  enable: () => void;
  disable: () => void;
  setConfig: (config: Partial<StressDetectorConfig>) => void;
  forceComplexity: (level: UIComplexityLevel) => void;
  resetToFull: () => void;

  // Queries
  getStressTrend: () => 'RISING' | 'STABLE' | 'FALLING';
  getRecommendedActions: () => string[];
}

const DEFAULT_CONFIG: StressDetectorConfig = {
  enabled: true,
  adaptiveUIEnabled: true,
  stressThresholds: {
    reduced: 50,
    minimal: 70,
    flowState: 85,
  },
  recoveryThreshold: 40,
  debounceMs: 3000,
  transitionDurationMs: 500,
};

const COMPLEXITY_ADAPTATIONS: Record<UIComplexityLevel, UIAdaptation> = {
  FULL: {
    level: 'FULL',
    hiddenElements: [],
    reducedAnimations: false,
    simplifiedLayout: false,
    focusMode: false,
  },
  REDUCED: {
    level: 'REDUCED',
    hiddenElements: ['secondary-panels', 'notifications', 'metrics-belt'],
    reducedAnimations: true,
    simplifiedLayout: false,
    focusMode: false,
  },
  MINIMAL: {
    level: 'MINIMAL',
    hiddenElements: [
      'secondary-panels',
      'notifications',
      'metrics-belt',
      'sidebar',
      'status-bar-details',
    ],
    reducedAnimations: true,
    simplifiedLayout: true,
    focusMode: false,
  },
  FLOW_STATE: {
    level: 'FLOW_STATE',
    hiddenElements: [
      'secondary-panels',
      'notifications',
      'metrics-belt',
      'sidebar',
      'status-bar-details',
      'dock',
      'header',
    ],
    reducedAnimations: true,
    simplifiedLayout: true,
    focusMode: true,
  },
};

export const useStressDetector = (): UseStressDetectorReturn => {
  const { actions, theme } = useAppStore();
  const { addLog, setTheme } = actions;

  // State
  const [config, setConfigState] = useState<StressDetectorConfig>(DEFAULT_CONFIG);
  const [stressLevel, setStressLevel] = useState<StressLevel>({
    value: 0,
    trend: 'STABLE',
    confidence: 0,
    timestamp: Date.now(),
  });
  const [uiComplexity, setUIComplexity] = useState<UIComplexityLevel>('FULL');
  const [adaptation, setAdaptation] = useState<UIAdaptation>(COMPLEXITY_ADAPTATIONS.FULL);
  const [isAdapting, setIsAdapting] = useState(false);

  // Refs
  const stressHistoryRef = useRef<number[]>([]);
  const lastAdaptationRef = useRef<number>(0);
  const previousThemeRef = useRef<string | null>(null);
  const adaptationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================================
  // STRESS MONITORING
  // ============================================================================

  useEffect(() => {
    if (!config.enabled) return;

    // Subscribe to kernel stress events
    const unsubscribe = agentKernel.on('STRESS_THRESHOLD', (event) => {
      handleStressEvent(event.payload);
    });

    // Poll stress level from kernel metrics
    const interval = setInterval(() => {
      const metrics = agentKernel.getMetrics();
      updateStressLevel(metrics.currentStressLevel);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [config.enabled]);

  useEffect(() => {
    return () => {
      if (adaptationTimeoutRef.current) clearTimeout(adaptationTimeoutRef.current);
    };
  }, []);

  const handleStressEvent = useCallback((payload: { level: number; trend: string }) => {
    updateStressLevel(payload.level);
  }, []);

  const updateStressLevel = useCallback((value: number) => {
    // Update history
    stressHistoryRef.current.push(value);
    if (stressHistoryRef.current.length > 60) {
      stressHistoryRef.current = stressHistoryRef.current.slice(-30);
    }

    // Calculate trend
    const trend = calculateTrend(stressHistoryRef.current);

    setStressLevel({
      value,
      trend,
      confidence: Math.min(1, stressHistoryRef.current.length / 10),
      timestamp: Date.now(),
    });

    // Check for adaptation trigger
    if (config.adaptiveUIEnabled) {
      checkAdaptationTrigger(value, trend);
    }
  }, [config.adaptiveUIEnabled]);

  // ============================================================================
  // UI ADAPTATION
  // ============================================================================

  const checkAdaptationTrigger = useCallback((stress: number, trend: 'RISING' | 'STABLE' | 'FALLING') => {
    const now = Date.now();

    // Debounce
    if (now - lastAdaptationRef.current < config.debounceMs) return;

    // Determine target complexity
    let targetComplexity: UIComplexityLevel = 'FULL';

    if (stress >= config.stressThresholds.flowState) {
      targetComplexity = 'FLOW_STATE';
    } else if (stress >= config.stressThresholds.minimal) {
      targetComplexity = 'MINIMAL';
    } else if (stress >= config.stressThresholds.reduced) {
      targetComplexity = 'REDUCED';
    } else if (stress <= config.recoveryThreshold && trend === 'FALLING') {
      // Recovery - increase complexity gradually
      targetComplexity = getRecoveryLevel(uiComplexity);
    } else {
      // Maintain current level
      targetComplexity = uiComplexity;
    }

    // Apply if different
    if (targetComplexity !== uiComplexity) {
      applyAdaptation(targetComplexity, stress);
    }
  }, [config, uiComplexity]);

  const applyAdaptation = useCallback((level: UIComplexityLevel, stressValue: number) => {
    setIsAdapting(true);
    lastAdaptationRef.current = Date.now();

    addLog('SYSTEM', `STRESS: Adapting UI to ${level} mode (stress: ${stressValue}%)`);

    const newAdaptation = COMPLEXITY_ADAPTATIONS[level];
    setUIComplexity(level);
    setAdaptation(newAdaptation);

    // Apply CSS classes for hidden elements
    applyDOMAdaptations(newAdaptation);

    // Switch to calming theme in flow state
    if (level === 'FLOW_STATE') {
      previousThemeRef.current = theme;
      // Use a calming theme variant
    } else if (level === 'FULL' && previousThemeRef.current) {
      // Restore previous theme
      previousThemeRef.current = null;
    }

    if (adaptationTimeoutRef.current) clearTimeout(adaptationTimeoutRef.current);
    adaptationTimeoutRef.current = setTimeout(() => {
      setIsAdapting(false);
    }, config.transitionDurationMs);
  }, [addLog, theme, config.transitionDurationMs]);

  const applyDOMAdaptations = useCallback((adaptation: UIAdaptation) => {
    const root = document.documentElement;

    // Apply data attributes for CSS-based hiding
    root.setAttribute('data-ui-complexity', adaptation.level);
    root.setAttribute('data-reduced-motion', String(adaptation.reducedAnimations));
    root.setAttribute('data-focus-mode', String(adaptation.focusMode));

    // Apply inline styles for transition
    if (adaptation.reducedAnimations) {
      root.style.setProperty('--animation-duration-multiplier', '0.1');
    } else {
      root.style.removeProperty('--animation-duration-multiplier');
    }
  }, []);

  const getRecoveryLevel = (current: UIComplexityLevel): UIComplexityLevel => {
    switch (current) {
      case 'FLOW_STATE':
        return 'MINIMAL';
      case 'MINIMAL':
        return 'REDUCED';
      case 'REDUCED':
        return 'FULL';
      default:
        return 'FULL';
    }
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const enable = useCallback(() => {
    setConfigState(prev => ({ ...prev, enabled: true }));
    agentKernel.setAdaptiveUIEnabled(true);
    addLog('SYSTEM', 'STRESS: Detector enabled');
  }, [addLog]);

  const disable = useCallback(() => {
    setConfigState(prev => ({ ...prev, enabled: false }));
    agentKernel.setAdaptiveUIEnabled(false);
    resetToFull();
    addLog('SYSTEM', 'STRESS: Detector disabled');
  }, [addLog]);

  const setConfig = useCallback((newConfig: Partial<StressDetectorConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  const forceComplexity = useCallback((level: UIComplexityLevel) => {
    applyAdaptation(level, stressLevel.value);
  }, [applyAdaptation, stressLevel.value]);

  const resetToFull = useCallback(() => {
    applyAdaptation('FULL', 0);
  }, [applyAdaptation]);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const getStressTrend = useCallback((): 'RISING' | 'STABLE' | 'FALLING' => {
    return calculateTrend(stressHistoryRef.current);
  }, []);

  const getRecommendedActions = useCallback((): string[] => {
    const actions: string[] = [];

    if (stressLevel.value >= 70) {
      actions.push('Take a short break');
      actions.push('Try deep breathing exercises');
      actions.push('Reduce active tasks');
    } else if (stressLevel.value >= 50) {
      actions.push('Consider simplifying your workflow');
      actions.push('Focus on one task at a time');
    }

    if (stressLevel.trend === 'RISING') {
      actions.push('Stress is increasing - monitor closely');
    }

    return actions;
  }, [stressLevel]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const calculateTrend = (history: number[]): 'RISING' | 'STABLE' | 'FALLING' => {
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

  return {
    stressLevel,
    uiComplexity,
    adaptation,
    isAdapting,
    stressHistory: stressHistoryRef.current.slice(-30),
    enable,
    disable,
    setConfig,
    forceComplexity,
    resetToFull,
    getStressTrend,
    getRecommendedActions,
  };
};
