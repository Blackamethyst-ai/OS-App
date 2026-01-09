/**
 * GAZE TRACKING HOOK
 *
 * Specialized hook for gaze-triggered context prefetching.
 * Integrates with the Agentic Kernel for proactive file surfacing.
 *
 * Features:
 * - Fixation detection and analysis
 * - Element-to-context mapping
 * - Gaze-triggered prefetch requests
 * - Attention heatmap generation
 *
 * Reference: arXiv:2512.16366 (Mind the Gaze: Adaptive UI)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel/AgentKernel';
import { GazePoint, GazeFixation } from '../services/kernel/types';

interface GazeTrackingConfig {
  enabled: boolean;
  fixationThresholdMs: number;
  prefetchThresholdMs: number;
  heatmapEnabled: boolean;
  debugOverlay: boolean;
}

interface HeatmapCell {
  x: number;
  y: number;
  intensity: number;
}

interface UseGazeTrackingReturn {
  // State
  isTracking: boolean;
  currentGaze: GazePoint | null;
  activeFixation: GazeFixation | null;
  recentFixations: GazeFixation[];
  focusedElementId: string | null;
  heatmap: HeatmapCell[];

  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  registerElement: (elementId: string, contextKeys: string[]) => void;
  unregisterElement: (elementId: string) => void;
  clearHeatmap: () => void;
  setConfig: (config: Partial<GazeTrackingConfig>) => void;

  // Queries
  getFixationHistory: (durationMs?: number) => GazeFixation[];
  getElementAttention: (elementId: string) => number;
}

const DEFAULT_CONFIG: GazeTrackingConfig = {
  enabled: true,
  fixationThresholdMs: 200,
  prefetchThresholdMs: 1500,
  heatmapEnabled: true,
  debugOverlay: false,
};

export const useGazeTracking = (): UseGazeTrackingReturn => {
  const { actions } = useAppStore();
  const { addLog } = actions;

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [config, setConfigState] = useState<GazeTrackingConfig>(DEFAULT_CONFIG);
  const [currentGaze, setCurrentGaze] = useState<GazePoint | null>(null);
  const [activeFixation, setActiveFixation] = useState<GazeFixation | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);

  // Refs
  const fixationHistoryRef = useRef<GazeFixation[]>([]);
  const elementMapRef = useRef<Map<string, string[]>>(new Map()); // elementId -> contextKeys
  const elementBoundsRef = useRef<Map<string, DOMRect>>(new Map());
  const prefetchedRef = useRef<Set<string>>(new Set());
  const heatmapGridRef = useRef<Map<string, number>>(new Map()); // "x,y" -> intensity

  // ============================================================================
  // TRACKING CONTROL
  // ============================================================================

  const startTracking = useCallback(() => {
    if (isTracking) return;

    setIsTracking(true);
    addLog('SYSTEM', 'GAZE: Tracking started');

    // Subscribe to kernel gaze events
    const unsubscribe = agentKernel.on('GAZE_FIXATION', (event) => {
      handleKernelFixation(event.payload as GazeFixation);
    });

    return () => {
      unsubscribe();
    };
  }, [isTracking, addLog]);

  const stopTracking = useCallback(() => {
    if (!isTracking) return;

    setIsTracking(false);
    setCurrentGaze(null);
    setActiveFixation(null);
    addLog('SYSTEM', 'GAZE: Tracking stopped');
  }, [isTracking, addLog]);

  // ============================================================================
  // ELEMENT REGISTRATION
  // ============================================================================

  const registerElement = useCallback((elementId: string, contextKeys: string[]) => {
    elementMapRef.current.set(elementId, contextKeys);

    // Cache element bounds
    const element = document.getElementById(elementId) ||
      document.querySelector(`[data-gaze-id="${elementId}"]`);
    if (element) {
      elementBoundsRef.current.set(elementId, element.getBoundingClientRect());
    }
  }, []);

  const unregisterElement = useCallback((elementId: string) => {
    elementMapRef.current.delete(elementId);
    elementBoundsRef.current.delete(elementId);
  }, []);

  // ============================================================================
  // FIXATION HANDLING
  // ============================================================================

  const handleKernelFixation = useCallback((fixation: GazeFixation) => {
    // Update active fixation
    setActiveFixation(fixation);

    // Add to history
    fixationHistoryRef.current.push(fixation);
    if (fixationHistoryRef.current.length > 100) {
      fixationHistoryRef.current = fixationHistoryRef.current.slice(-50);
    }

    // Update focused element
    const elementId = findElementAtPoint(fixation.centroid.x, fixation.centroid.y);
    setFocusedElementId(elementId);

    // Update heatmap
    if (config.heatmapEnabled) {
      updateHeatmap(fixation.centroid.x, fixation.centroid.y, fixation.duration);
    }

    // Trigger prefetch if fixation is long enough
    if (fixation.duration >= config.prefetchThresholdMs && elementId) {
      triggerPrefetch(elementId, fixation);
    }
  }, [config.heatmapEnabled, config.prefetchThresholdMs]);

  const triggerPrefetch = useCallback((elementId: string, fixation: GazeFixation) => {
    // Check if already prefetched recently
    const prefetchKey = `${elementId}:${Math.floor(Date.now() / 10000)}`; // 10 second window
    if (prefetchedRef.current.has(prefetchKey)) return;

    prefetchedRef.current.add(prefetchKey);

    // Get context keys for this element
    const contextKeys = elementMapRef.current.get(elementId);
    if (contextKeys && contextKeys.length > 0) {
      addLog('SYSTEM', `GAZE: Prefetching context for ${elementId}`);

      // Request prefetch from semantic pager
      const pager = agentKernel.getSemanticPager();
      pager.prefetchForElement(elementId);
    }

    // Cleanup old prefetch markers
    if (prefetchedRef.current.size > 100) {
      const entries = Array.from(prefetchedRef.current);
      prefetchedRef.current = new Set(entries.slice(-50));
    }
  }, [addLog]);

  // ============================================================================
  // HEATMAP
  // ============================================================================

  const updateHeatmap = useCallback((x: number, y: number, duration: number) => {
    // Grid cell size
    const cellSize = 50;
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    const key = `${gridX},${gridY}`;

    // Intensity based on duration
    const intensity = Math.min(1, duration / 5000);
    const currentIntensity = heatmapGridRef.current.get(key) || 0;
    heatmapGridRef.current.set(key, Math.min(1, currentIntensity + intensity));

    // Convert to array
    const cells: HeatmapCell[] = [];
    heatmapGridRef.current.forEach((intensity, key) => {
      const [gx, gy] = key.split(',').map(Number);
      cells.push({
        x: gx * cellSize,
        y: gy * cellSize,
        intensity,
      });
    });

    setHeatmap(cells);
  }, []);

  const clearHeatmap = useCallback(() => {
    heatmapGridRef.current.clear();
    setHeatmap([]);
  }, []);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const getFixationHistory = useCallback((durationMs: number = 60000): GazeFixation[] => {
    const cutoff = Date.now() - durationMs;
    return fixationHistoryRef.current.filter(f => f.endTime >= cutoff);
  }, []);

  const getElementAttention = useCallback((elementId: string): number => {
    const recentFixations = getFixationHistory(60000); // Last minute
    const elementFixations = recentFixations.filter(f => {
      const bounds = elementBoundsRef.current.get(elementId);
      if (!bounds) return false;
      return isPointInBounds(f.centroid, bounds);
    });

    // Calculate attention as percentage of time focused
    const totalFocusTime = elementFixations.reduce((sum, f) => sum + f.duration, 0);
    const maxTime = 60000;
    return Math.min(100, (totalFocusTime / maxTime) * 100);
  }, [getFixationHistory]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const findElementAtPoint = (x: number, y: number): string | null => {
    // First check registered elements
    for (const [elementId, bounds] of elementBoundsRef.current.entries()) {
      if (isPointInBounds({ x, y }, bounds)) {
        return elementId;
      }
    }

    // Fallback to DOM query
    const element = document.elementFromPoint(x, y);
    return element?.id || element?.getAttribute('data-gaze-id') || null;
  };

  const isPointInBounds = (
    point: { x: number; y: number },
    bounds: DOMRect
  ): boolean => {
    return (
      point.x >= bounds.left &&
      point.x <= bounds.right &&
      point.y >= bounds.top &&
      point.y <= bounds.bottom
    );
  };

  // ============================================================================
  // CONFIG
  // ============================================================================

  const setConfig = useCallback((newConfig: Partial<GazeTrackingConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update element bounds on scroll/resize
  useEffect(() => {
    const updateBounds = () => {
      elementMapRef.current.forEach((_, elementId) => {
        const element = document.getElementById(elementId) ||
          document.querySelector(`[data-gaze-id="${elementId}"]`);
        if (element) {
          elementBoundsRef.current.set(elementId, element.getBoundingClientRect());
        }
      });
    };

    window.addEventListener('scroll', updateBounds);
    window.addEventListener('resize', updateBounds);

    return () => {
      window.removeEventListener('scroll', updateBounds);
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  return {
    isTracking,
    currentGaze,
    activeFixation,
    recentFixations: fixationHistoryRef.current.slice(-10),
    focusedElementId,
    heatmap,
    startTracking,
    stopTracking,
    registerElement,
    unregisterElement,
    clearHeatmap,
    setConfig,
    getFixationHistory,
    getElementAttention,
  };
};
