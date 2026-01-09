/**
 * USE ADAPTIVE UI HOOK
 *
 * React hook for the Self-Synthesizing Adaptive UI system.
 * Connects biometric sensors to the AUI Engine and DOM Regenerator.
 *
 * Features:
 * - Real-time UI regeneration based on biometrics
 * - Semantic gaze integration
 * - Judge agent evaluation feedback
 * - Liquid transition orchestration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel';
import {
  auiEngine,
  judgeAgent,
  semanticGaze,
  domRegenerator,
  UILayoutSpec,
  UIEvaluation,
  AUIGenerationContext,
  GazeSemanticContext,
} from '../services/ui';

// ============================================================================
// TYPES
// ============================================================================

interface AdaptiveUIState {
  // System state
  isEnabled: boolean;
  isRegenerating: boolean;
  lastRegenerationTime: number | null;

  // Layout state
  currentLayout: UILayoutSpec | null;
  layoutVersion: number;

  // Evaluation state
  lastEvaluation: UIEvaluation | null;
  evaluationScore: number;

  // Gaze state
  gazeSemantics: GazeSemanticContext | null;

  // Performance
  regenerationLatency: number;
  iterationCount: number;
}

interface UseAdaptiveUIReturn extends AdaptiveUIState {
  // Actions
  enable: () => void;
  disable: () => void;
  triggerRegeneration: (reason?: string) => Promise<void>;
  forceLayout: (layout: UILayoutSpec) => void;

  // Queries
  getLayoutForRegion: (regionId: string) => UILayoutSpec['regions'][0] | null;
  shouldShowComponent: (componentId: string) => boolean;
  getComponentPriority: (componentId: string) => number;

  // Events
  onLayoutChange: (callback: (layout: UILayoutSpec) => void) => () => void;
  onEvaluation: (callback: (evaluation: UIEvaluation) => void) => () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useAdaptiveUI = (): UseAdaptiveUIReturn => {
  const { actions } = useAppStore();
  const { addLog } = actions;

  // State
  const [state, setState] = useState<AdaptiveUIState>({
    isEnabled: true,
    isRegenerating: false,
    lastRegenerationTime: null,
    currentLayout: null,
    layoutVersion: 0,
    lastEvaluation: null,
    evaluationScore: 0,
    gazeSemantics: null,
    regenerationLatency: 0,
    iterationCount: 0,
  });

  // Callback refs
  const layoutCallbacksRef = useRef<Set<(layout: UILayoutSpec) => void>>(new Set());
  const evaluationCallbacksRef = useRef<Set<(evaluation: UIEvaluation) => void>>(new Set());

  // ============================================================================
  // KERNEL EVENT SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    // Subscribe to kernel events
    const unsubRegenStart = agentKernel.on('UI_REGENERATION_START', () => {
      setState(prev => ({ ...prev, isRegenerating: true }));
    });

    const unsubRegenComplete = agentKernel.on('UI_REGENERATION_COMPLETE', (event) => {
      const { layout, evaluation, iterations, latencyMs } = event.payload;

      setState(prev => ({
        ...prev,
        isRegenerating: false,
        lastRegenerationTime: Date.now(),
        currentLayout: layout,
        layoutVersion: prev.layoutVersion + 1,
        lastEvaluation: evaluation,
        evaluationScore: evaluation.score,
        regenerationLatency: latencyMs,
        iterationCount: iterations,
      }));

      // Notify callbacks
      layoutCallbacksRef.current.forEach(cb => cb(layout));
      evaluationCallbacksRef.current.forEach(cb => cb(evaluation));

      addLog('SYSTEM', `AUI: Layout regenerated (Score: ${evaluation.score}, ${latencyMs.toFixed(0)}ms)`);
    });

    const unsubEvaluation = agentKernel.on('UI_EVALUATION', (event) => {
      const { evaluation } = event.payload;
      setState(prev => ({
        ...prev,
        lastEvaluation: evaluation,
        evaluationScore: evaluation.score,
      }));

      evaluationCallbacksRef.current.forEach(cb => cb(evaluation));
    });

    return () => {
      unsubRegenStart();
      unsubRegenComplete();
      unsubEvaluation();
    };
  }, [addLog]);

  // ============================================================================
  // SEMANTIC GAZE INTEGRATION
  // ============================================================================

  useEffect(() => {
    if (!state.isEnabled) return;

    // Listen for gaze updates
    const handleGazeUpdate = async (event: CustomEvent) => {
      const { x, y } = event.detail;

      // Build semantic context from gaze
      const gazeX = x * window.innerWidth;
      const gazeY = y * window.innerHeight;

      const semantics = await semanticGaze.buildSemanticContext(gazeX, gazeY);

      setState(prev => ({
        ...prev,
        gazeSemantics: semantics,
      }));
    };

    window.addEventListener('biometric-gaze-update' as any, handleGazeUpdate);

    return () => {
      window.removeEventListener('biometric-gaze-update' as any, handleGazeUpdate);
    };
  }, [state.isEnabled]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const enable = useCallback(() => {
    agentKernel.setAUIEnabled(true);
    setState(prev => ({ ...prev, isEnabled: true }));
    addLog('SYSTEM', 'AUI: Adaptive UI enabled');
  }, [addLog]);

  const disable = useCallback(() => {
    agentKernel.setAUIEnabled(false);
    setState(prev => ({ ...prev, isEnabled: false }));
    addLog('SYSTEM', 'AUI: Adaptive UI disabled');
  }, [addLog]);

  const triggerRegeneration = useCallback(async (reason?: string) => {
    if (!state.isEnabled || state.isRegenerating) return;

    await agentKernel.triggerUIRegeneration(reason || 'Manual trigger');
  }, [state.isEnabled, state.isRegenerating]);

  const forceLayout = useCallback((layout: UILayoutSpec) => {
    domRegenerator.setLayout(layout);
    setState(prev => ({
      ...prev,
      currentLayout: layout,
      layoutVersion: prev.layoutVersion + 1,
    }));
  }, []);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const getLayoutForRegion = useCallback((regionId: string) => {
    return state.currentLayout?.regions.find(r => r.id === regionId) || null;
  }, [state.currentLayout]);

  const shouldShowComponent = useCallback((componentId: string) => {
    if (!state.currentLayout) return true;

    const components = state.currentLayout.regions.flatMap(r => r.components);
    const component = components.find(c => c.id === componentId);

    return component?.visible ?? true;
  }, [state.currentLayout]);

  const getComponentPriority = useCallback((componentId: string) => {
    if (!state.currentLayout) return 0;

    const components = state.currentLayout.regions.flatMap(r => r.components);
    const component = components.find(c => c.id === componentId);

    return component?.priority ?? 0;
  }, [state.currentLayout]);

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  const onLayoutChange = useCallback((callback: (layout: UILayoutSpec) => void) => {
    layoutCallbacksRef.current.add(callback);
    return () => layoutCallbacksRef.current.delete(callback);
  }, []);

  const onEvaluation = useCallback((callback: (evaluation: UIEvaluation) => void) => {
    evaluationCallbacksRef.current.add(callback);
    return () => evaluationCallbacksRef.current.delete(callback);
  }, []);

  return {
    ...state,
    enable,
    disable,
    triggerRegeneration,
    forceLayout,
    getLayoutForRegion,
    shouldShowComponent,
    getComponentPriority,
    onLayoutChange,
    onEvaluation,
  };
};

export default useAdaptiveUI;
